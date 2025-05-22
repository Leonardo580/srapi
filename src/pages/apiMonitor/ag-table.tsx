// src/components/LogsTable.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_ColumnFiltersState,
    type MRT_PaginationState,
    type MRT_SortingState,
    type MRT_VisibilityState,
    // type MRT_Column, // Not explicitly needed for this change, but good to know
} from 'material-react-table';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {Box as MuiBox} from '@mui/material';
import {Button as AntButton, Space as AntSpace, Tooltip as AntTooltip, Spin, Alert, Popover as AntPopover, Tag as AntTag} from 'antd';
import {EyeInvisibleOutlined, EyeOutlined, SyncOutlined} from '@ant-design/icons';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'; // Added
import dayjs from 'dayjs'; // Added
// At the top of LogsTable.tsx

import {CSSTransition} from 'react-transition-group';
import { DatePicker } from "antd";
import ElasticService, {
    ApiSearchParams,
    FieldFilter as ApiFieldFilter,
    FieldFilterType,
} from '@/api/services/elasticService.ts';
import ColumnManagerDnD, {ColumnDnDItem} from './ColumnManagerDnd.tsx';
import {FieldMappingInfo, getFlattenedMapping} from '@/utils/mappingHelper.ts';
import GlobalLogFilterForm from "@/pages/apiMonitor/global-log-filter-form.tsx"; // Ensure this path is correct

export interface LogEntry {
    _id: string;
    '@timestamp': string;
    message: string;
    level: string;
    client_ip?: string;
    [key: string]: any;
}
export interface DynamicFilterItem {
    field: string;
    value: any;
}

export interface GlobalFilterState {
    mainSearch?: string;
    level?: string;
    timestampRange?: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    additionalFilters?: DynamicFilterItem[];
}

interface LogsTableProps { // Renamed from APIGridTableProps for clarity with file name
    globalQueryFilters?: GlobalFilterState; // Allow it to be undefined
}

// Helper to get color for HTTP status codes
const getStatusColor = (status: any): string => {
    const numericStatus = Number(status);
    if (isNaN(numericStatus)) return 'default'; // AntD Tag default color

    if (numericStatus >= 100 && numericStatus < 200) return 'processing'; // Blueish
    if (numericStatus >= 200 && numericStatus < 300) return 'success';    // Green
    if (numericStatus >= 300 && numericStatus < 400) return 'blue';       // Blue
    if (numericStatus >= 400 && numericStatus < 500) return 'warning';   // Orange
    if (numericStatus >= 500 && numericStatus < 600) return 'error';     // Red
    return 'default';
};

// Helper to get color for HTTP methods
const getHttpMethodColor = (method: any): string => {
    const upperMethod = String(method ?? '').toUpperCase();
    switch (upperMethod) {
        case 'GET': return 'blue';
        case 'POST': return 'green';
        case 'PUT': return 'orange';
        case 'DELETE': return 'red';
        case 'PATCH': return 'gold';
        case 'OPTIONS': return 'purple';
        case 'HEAD': return 'cyan';
        default: return 'default';
    }
};

// Helper component for truncated text with a "More" button/popover
const TruncatedTextCell: React.FC<{ text: string | null | undefined; maxLength?: number }> = ({ text, maxLength = 100 }) => {
    const fullText = String(text ?? ''); // Ensure it's a string

    if (fullText.length <= maxLength) {
        return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fullText}</span>;
    }

    const truncated = fullText.substring(0, maxLength) + "...";

    return (
        <AntSpace direction="vertical" align="start" style={{ width: '100%' }}>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{truncated}</span>
            <AntPopover
                content={<div style={{ maxWidth: '400px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fullText}</div>}
                title="Full Text"
                trigger="click"
                placement="bottomLeft"
            >
                <AntButton type="link" size="small" style={{ padding: 0, height: 'auto', lineHeight: 'normal' }}>
                    Show More
                </AntButton>
            </AntPopover>
        </AntSpace>
    );
};
const getNestedValue = (path: string, obj: any): any => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const formatHeader = (path: string): string => {
    if (path === '@timestamp') return 'Timestamp';
    return path.replace(/_/g, ' ').replace(/\./g, ' / ').replace(/([A-Z])/g, ' $1').replace(/\b\w/g, char => char.toUpperCase()).trim();
};

const discoverAllPaths = (data: LogEntry[]): string[] => {
    const paths = new Set<string>();
    const recurse = (obj: any, currentPath: string) => {
        if (obj === null || typeof obj !== 'object' || obj instanceof Date || Array.isArray(obj)) {
            if (currentPath) paths.add(currentPath); return;
        }
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                recurse(obj[key], newPath);
            }
        }
        if (Object.keys(obj).length === 0 && currentPath) paths.add(currentPath);
    };
    data.forEach(item => recurse(item, ''));
    return Array.from(paths);
};

const LogsTable: React.FC<LogsTableProps> = ({globalQueryFilters}) => {
    const [data, setData] = useState<LogEntry[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<MRT_ColumnDef<LogEntry>[]>([]);
    const [isError, setIsError] = useState(false); // Data fetch error
    const [isLoading, setIsLoading] = useState(false); // Data loading (after mapping)
    const [isRefetching, setIsRefetching] = useState(false);
    const [rowCount, setRowCount] = useState(0);

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<MRT_SortingState>([]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 10 });

    const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({});
    const [columnVisibilityInitialized, setColumnVisibilityInitialized] = useState(false);
    const [showColumnManager, setShowColumnManager] = useState(false);
    const animatedNodeRef = useRef(null);

    const [processedMapping, setProcessedMapping] = useState<Record<string, FieldMappingInfo> | null>(null);
    const [isMappingLoading, setIsMappingLoading] = useState(true);
    const [mappingError, setMappingError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndProcessMapping = async () => {
            setIsMappingLoading(true);
            setMappingError(null);
            setProcessedMapping(null);
            try {
                const properties = await ElasticService.getMapping();
                if (!properties || Object.keys(properties).length === 0) {
                    throw new Error("Mapping properties not found or empty in response.");
                }
                const flatMapping = properties[0];
                setProcessedMapping(flatMapping);
            } catch (err) {
                console.error("Failed to fetch or process ES mapping:", err);
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching mapping.";
                setMappingError(errorMessage);
                setProcessedMapping({});
            } finally {
                setIsMappingLoading(false);
            }
        };
        fetchAndProcessMapping();
    }, []);

    const getColumnFilterVariant = useCallback((fieldPath: string): MRT_ColumnDef<LogEntry>['filterVariant'] => {
        if (!processedMapping) return 'text';
        const mappingInfo = processedMapping[fieldPath];
        if (!mappingInfo) return 'text';

        switch (mappingInfo.type) {
            // case 'date': return 'date-range';
            case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float': return 'range';
            case 'keyword': return fieldPath === 'level' ? 'select' : 'text';
            case 'ip': return 'range'; // Assuming 'ip' type might be filtered as a range or text; 'text' might be safer if not specifically IP range
            case 'boolean': return 'checkbox';
            default: return 'text';
        }
    }, [processedMapping]);

    const generateColumns = useCallback((logEntries: LogEntry[]): MRT_ColumnDef<LogEntry>[] => {
        if (!processedMapping || logEntries.length === 0) return [];
        const allDiscoveredPaths = discoverAllPaths(logEntries);

        return allDiscoveredPaths
            .filter(path => path !== '_id' && !path.startsWith('_id.'))
            .map((path): MRT_ColumnDef<LogEntry> => {
                const mappingInfo = processedMapping![path]; // Safe with the check above
                const columnDef: MRT_ColumnDef<LogEntry> = {
                    id: path,
                    accessorFn: (originalRow) => getNestedValue(path, originalRow),
                    header: formatHeader(path),
                    enableColumnFilter: (mappingInfo && mappingInfo.type !== 'object'),
                    // filterVariant is now set conditionally below
                };

                // --- Custom Cell Rendering Logic ---
                const CellRenderer: React.FC<{ value: any }> = ({ value }) => {
                    // IMPORTANT: Replace 'http_status_code_field' and 'http_method_field'
                    // with the actual names of these fields in your LogEntry data / mapping.
                    const httpStatusCodeField = 'http_status'; // EXAMPLE: Change this
                    const httpMethodField = 'http_method';     // EXAMPLE: Change this

                    // PRIORITY 1: Specific field handling
                    if (path === 'message') {
                        return <TruncatedTextCell text={value} maxLength={120} />; // Adjust maxLength as needed
                    }
                    if (path === httpStatusCodeField) {
                        const color = getStatusColor(value);
                        return <AntTag color={color}>{String(value ?? '')}</AntTag>;
                    }
                    if (path === httpMethodField) {
                        console.log(path)
                        const color = getHttpMethodColor(value);
                        return <AntTag color={color}>{String(value ?? '').toUpperCase()}</AntTag>;
                    }

                    // PRIORITY 2: Type-based handling (like existing date handling)
                    if (path === '@timestamp' || mappingInfo?.type === 'date') {
                        try {
                            return value ? new Date(value as string).toLocaleString() : '';
                        } catch (e) {
                            return String(value ?? '');
                        }
                    }

                    // PRIORITY 3: Generic handling for objects (if not caught above)
                    if (typeof value === 'object' && value !== null) {
                        return JSON.stringify(value);
                    }

                    // Default: render as string
                    return String(value ?? '');
                };
                columnDef.Cell = ({ cell }) => <CellRenderer value={cell.getValue()} />;
                // --- End of Custom Cell Rendering Logic ---


                // Filter setup (your existing logic, ensure it's correct after previous changes)
                if (mappingInfo?.type === 'date') {
                    columnDef.Filter = ({ column }) => {
                        const filterValue = (column.getFilterValue() || [null, null]) as [Date | null, Date | null];
                        return (
                            <MuiBox sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, minWidth: '280px' }}>
                                <DateTimePicker
                                    label="Start Date/Time"
                                    format="DD/MM/YYYY HH:mm"
                                    ampm={false}
                                    value={filterValue[0] ? dayjs(filterValue[0]) : null}
                                    onChange={(newValue) => {
                                        column.setFilterValue([newValue ? newValue.toDate() : null, filterValue[1]]);
                                    }}
                                    slotProps={{ textField: { variant: 'standard', fullWidth: true } }}
                                />
                                <DateTimePicker
                                    label="End Date/Time"
                                    format="DD/MM/YYYY HH:mm"
                                    ampm={false}
                                    value={filterValue[1] ? dayjs(filterValue[1]) : null}
                                    onChange={(newValue) => {
                                        column.setFilterValue([filterValue[0], newValue ? newValue.toDate() : null]);
                                    }}
                                    slotProps={{ textField: { variant: 'standard', fullWidth: true } }}
                                    minDateTime={filterValue[0] ? dayjs(filterValue[0]) : undefined}
                                />
                            </MuiBox>
                        );
                    };
                    // No filterVariant needed here as Filter prop takes precedence
                } else {
                    // For other column types, use the standard filterVariant
                    columnDef.filterVariant = getColumnFilterVariant(path);
                }

                // Other specific column configurations
                if (path === 'level' && mappingInfo?.type === 'keyword') {
                    columnDef.filterSelectOptions = [
                        { text: 'Error', value: 'error' }, { text: 'Warn', value: 'warn' },
                        { text: 'Info', value: 'info' }, { text: 'Debug', value: 'debug' },
                    ];
                } else if (path === 'message') {
                    columnDef.size = 350; // Adjust size for the message column if desired
                }
                return columnDef;
            });
    }, [processedMapping, getColumnFilterVariant]); // Removed generateColumns from its own deps if it was there
    useEffect(() => {
        if (dynamicColumns.length > 0 && !columnVisibilityInitialized && processedMapping) {
            const initialVisibility = dynamicColumns.reduce((acc, col) => {
                if (col.id) acc[col.id] = true;
                return acc;
            }, {} as MRT_VisibilityState);
            setColumnVisibility(initialVisibility);
            setColumnVisibilityInitialized(true);
        }
    }, [dynamicColumns, columnVisibilityInitialized, processedMapping]);

    const fetchData = useCallback(async (forceColumnReset = false) => {
        console.log('fetchData START', { paginationPg: pagination.pageIndex, globalQueryFilters, colFilters: columnFilters.length }); // Debug log

        if (forceColumnReset) {
            setDynamicColumns([]);
            setColumnVisibility({});
            setColumnVisibilityInitialized(false);
        }

        if ((isMappingLoading || mappingError) && dynamicColumns.length === 0 && !forceColumnReset) {
            if (!isMappingLoading) setIsLoading(false); // Only set if mapping finished
            console.log('fetchData: Bailing early due to mapping state or empty columns (initial)');
            return;
        }

        // Determine loading state
        const isInitialLoadOrForcedReset = (dynamicColumns.length === 0 && data.length === 0 && !isMappingLoading && !mappingError) || forceColumnReset;
        if (isInitialLoadOrForcedReset) {
            setIsLoading(true);
            setIsRefetching(false);
        } else {
            setIsRefetching(true);
            setIsLoading(false);
        }

        const apiParams: ApiSearchParams = {
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
            sortFields: sorting.length > 0 ? sorting.map(s => s.id) : ['@timestamp'],
            sortOrder: sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'desc',
        };

        let allCombinedApiFilters: ApiFieldFilter[] = [];

        // 1. Process Column Filters (your existing MRT column filter logic)
        if (processedMapping) { // Only process column filters if mapping is available
            const columnApiFiltersProcessed: ApiFieldFilter[] = columnFilters.map(mrtFilter => {
                const { id: fieldPath, value: mrtValue } = mrtFilter;
                const mappingInfo = processedMapping[fieldPath];
                let apiFilterValue: any = mrtValue;
                let apiFilterType: FieldFilterType = 'match'; // Default

                if (!mappingInfo) {
                    if (mrtValue === '' || mrtValue === null || mrtValue === undefined || (Array.isArray(mrtValue) && mrtValue.length === 0)) return null;
                    return { field: fieldPath, value: String(mrtValue), type: 'match' };
                }

                // Your existing switch case for mappingInfo.type for MRT filters
                switch (mappingInfo.type) {
                    case 'date':
                        apiFilterType = 'range';
                        if (Array.isArray(mrtValue) && mrtValue.length === 2) {
                            const gte = mrtValue[0] ? (mrtValue[0] instanceof Date ? mrtValue[0].toISOString() : String(mrtValue[0])) : undefined;
                            const lte = mrtValue[1] ? (mrtValue[1] instanceof Date ? mrtValue[1].toISOString() : String(mrtValue[1])) : undefined;
                            if (gte === undefined && lte === undefined) return null;
                            apiFilterValue = { gte, lte };
                        } else { return null; }
                        break;
                    case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float':
                        apiFilterType = 'range';
                        if (Array.isArray(mrtValue) && mrtValue.length === 2) {
                            const gte = (mrtValue[0] !== null && String(mrtValue[0]).trim() !== '') ? Number(mrtValue[0]) : undefined;
                            const lte = (mrtValue[1] !== null && String(mrtValue[1]).trim() !== '') ? Number(mrtValue[1]) : undefined;
                            if (gte === undefined && lte === undefined) return null;
                            apiFilterValue = { gte, lte };
                            if ((apiFilterValue.gte !== undefined && isNaN(apiFilterValue.gte)) || (apiFilterValue.lte !== undefined && isNaN(apiFilterValue.lte))) return null;
                        } else if ( (typeof mrtValue === 'number' && !isNaN(mrtValue)) || (typeof mrtValue === 'string' && mrtValue.trim() !== '' && !isNaN(Number(mrtValue))) ) {
                            apiFilterType = 'term'; apiFilterValue = Number(mrtValue);
                        } else { return null; }
                        break;
                    case 'keyword': case 'constant_keyword': case 'ip': // For MRT column filter, ip usually uses text input
                        apiFilterType = 'term';
                        if (Array.isArray(mrtValue) && mrtValue.length > 0) { // For select type filters
                            apiFilterType = 'terms'; apiFilterValue = mrtValue.map(String);
                        } else if (mrtValue !== null && mrtValue !== undefined && String(mrtValue).trim() !== '') {
                            apiFilterValue = String(mrtValue);
                        } else { return null; }
                        break;
                    case 'text': case 'match_only_text':
                        apiFilterType = 'match'; apiFilterValue = String(mrtValue);
                        break;
                    case 'boolean':
                        apiFilterType = 'term';
                        if (mrtValue === true || mrtValue === false) apiFilterValue = mrtValue;
                        else return null;
                        break;
                    default:
                        if (mrtValue === '' || mrtValue === null || mrtValue === undefined ) return null;
                        apiFilterType = 'match'; apiFilterValue = String(mrtValue);
                }

                if (apiFilterValue === '' || apiFilterValue === null || apiFilterValue === undefined) return null;
                if (Array.isArray(apiFilterValue) && apiFilterValue.length === 0) return null;
                if (apiFilterType === 'range' && typeof apiFilterValue === 'object' && apiFilterValue.gte === undefined && apiFilterValue.lte === undefined) return null;
                return { field: fieldPath, value: apiFilterValue, type: apiFilterType };
            }).filter(f => f !== null) as ApiFieldFilter[];
            allCombinedApiFilters.push(...columnApiFiltersProcessed);
        }


        // 2. Process Global Query Filters (from props)
        if (globalQueryFilters && processedMapping) {
            // Main Search
            if (globalQueryFilters.mainSearch && globalQueryFilters.mainSearch.trim() !== '') {
                allCombinedApiFilters.push({
                    field: 'message', // Or your primary search field for global search
                    value: globalQueryFilters.mainSearch.trim(),
                    type: 'match_phrase', // Or 'match'
                });
            }
            // Level filter
            if (globalQueryFilters.level && globalQueryFilters.level !== '') {
                allCombinedApiFilters.push({ field: 'level', value: globalQueryFilters.level, type: 'term' });
            }
            // Timestamp range filter (global)
            if (globalQueryFilters.timestampRange) {
                const [startDayjs, endDayjs] = globalQueryFilters.timestampRange;
                const gte = startDayjs ? startDayjs.toISOString() : undefined;
                const lte = endDayjs ? endDayjs.toISOString() : undefined;
                if (gte || lte) {
                    allCombinedApiFilters.push({ field: '@timestamp', value: { gte, lte }, type: 'range' });
                }
            }

            // Process additionalFilters from global form
            if (globalQueryFilters.additionalFilters) {
                globalQueryFilters.additionalFilters.forEach(dynFilter => {
                    if (!dynFilter.field || dynFilter.value === undefined || dynFilter.value === null) {
                        return; // Skip invalid dynamic filters
                    }
                    const fieldInfo = processedMapping[dynFilter.field];
                    if (!fieldInfo) {
                        const valueStr = typeof dynFilter.value === 'object' ? JSON.stringify(dynFilter.value) : String(dynFilter.value);
                        if (valueStr.trim() === '' || valueStr === '{}' || valueStr === '[]') return;
                        console.warn(`Mapping not found for dynamic filter field: ${dynFilter.field}. Using default 'match'.`);
                        allCombinedApiFilters.push({ field: dynFilter.field, value: String(dynFilter.value), type: 'match'});
                        return;
                    }

                    let dynamicApiValue: any = dynFilter.value;
                    let dynamicApiType: FieldFilterType = 'term';

                    switch (fieldInfo.type.toLowerCase()) {
                        case 'date':
                            dynamicApiType = 'range';
                            if (Array.isArray(dynFilter.value) && dynFilter.value.length === 2) {
                                const gte = dynFilter.value[0] ? (dynFilter.value[0] as dayjs.Dayjs).toISOString() : undefined;
                                const lte = dynFilter.value[1] ? (dynFilter.value[1] as dayjs.Dayjs).toISOString() : undefined;
                                if (!gte && !lte) return;
                                dynamicApiValue = { gte, lte };
                            } else { return; }
                            break;
                        case 'ip':
                            dynamicApiType = 'range';
                            if (typeof dynFilter.value === 'object' && dynFilter.value !== null) {
                                const gte = (dynFilter.value as any).from?.trim() || undefined;
                                const lte = (dynFilter.value as any).to?.trim() || undefined;
                                if (!gte && !lte) return;
                                dynamicApiValue = { gte, lte };
                            } else { return; }
                            break;
                        case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float': case 'scaled_float':
                            dynamicApiValue = Number(dynFilter.value);
                            if (isNaN(dynamicApiValue)) return;
                            dynamicApiType = 'term';
                            break;
                        case 'boolean':
                            dynamicApiValue = dynFilter.value;
                            dynamicApiType = 'term';
                            break;
                        case 'keyword':
                            dynamicApiValue = String(dynFilter.value);
                            dynamicApiType = 'term';
                            break;
                        case 'text':
                            dynamicApiValue = String(dynFilter.value);
                            dynamicApiType = 'match';
                            break;
                        default:
                            if (String(dynFilter.value).trim() === '') return;
                            dynamicApiValue = String(dynFilter.value);
                            dynamicApiType = 'match';
                    }
                    allCombinedApiFilters.push({ field: dynFilter.field, value: dynamicApiValue, type: dynamicApiType });
                });
            }
        } else if (globalQueryFilters && !processedMapping) {
            console.warn("fetchData: globalQueryFilters exist but processedMapping is null. Global filters may not be applied correctly.");
        }


        if (allCombinedApiFilters.length > 0) {
            apiParams.filters = allCombinedApiFilters;
        }
        console.log('fetchData: API PARAMS:', JSON.stringify(apiParams, null, 2));


        try {
            const result = await ElasticService.getData(apiParams.page, apiParams.pageSize, {
                sortFields: apiParams.sortFields, sortOrder: apiParams.sortOrder, filters: apiParams.filters,
            });
            console.log('fetchData: API RESULT total:', result.total);
            setData(result.data);
            setRowCount(result.total);
            if (processedMapping && (dynamicColumns.length === 0 || forceColumnReset) && result.data.length > 0) {
                const newColumns = generateColumns(result.data);
                setDynamicColumns(newColumns);
            }
            setIsError(false);
        } catch (error) {
            setIsError(true);
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
            console.log('fetchData END');
        }
    }, [
        pagination, sorting, columnFilters, // MRT state filters
        processedMapping, isMappingLoading, mappingError, // Mapping and its state
        dynamicColumns.length, generateColumns, data.length, // Column generation and data state (length for dep)
        globalQueryFilters // The new global filters from props
    ]);

    // The useEffect that calls fetchData initially and when dependencies change
    useEffect(() => {
        if (!isMappingLoading && !mappingError) { // Wait for mapping to be ready
            fetchData();
        }
        // No explicit fetchData in deps for initial load, but fetchData itself changes
        // when its own dependencies (like globalQueryFilters, pagination) change.
    }, [isMappingLoading, mappingError, fetchData, GlobalLogFilterForm]);

    const muiTheme = useMemo(() => createTheme({ palette: { mode: 'light' } }), []);

    const allColumnsForDnD: ColumnDnDItem[] = useMemo(() => {
        if (!dynamicColumns || dynamicColumns.length === 0) return [];
        return dynamicColumns.map(col => ({
            id: col.id!, header: typeof col.header === 'string' ? col.header : col.id!,
        }));
    }, [dynamicColumns]);

    if (isMappingLoading) {
        return <MuiBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Loading field mapping..." /></MuiBox>;
    }
    if (mappingError && (!processedMapping || Object.keys(processedMapping).length === 0) ) {
        return <MuiBox sx={{ p: 2 }}><Alert message="Critical Error" description={`Error loading field mapping: ${mappingError}. Table cannot be displayed.`} type="error" showIcon /></MuiBox>;
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>

        <MuiBox sx={{ p: 2, background: '#f0f2f5', minHeight: '100vh' }}>
            <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                <MuiBox sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', background: '#fff', p: 2, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <AntButton
                        type="default"
                        icon={showColumnManager ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => setShowColumnManager(prev => !prev)}
                        disabled={dynamicColumns.length === 0}
                    >
                        {showColumnManager ? 'Hide' : 'Show'} Column Manager
                    </AntButton>
                </MuiBox>

                <CSSTransition
                    nodeRef={animatedNodeRef}
                    in={showColumnManager && dynamicColumns.length > 0 && !!processedMapping}
                    timeout={300}
                    classNames="column-manager"
                    unmountOnExit
                    mountOnEnter
                >
                    <MuiBox ref={animatedNodeRef} sx={{ mb:2, background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <ColumnManagerDnD
                            allPossibleColumns={allColumnsForDnD}
                            currentVisibility={columnVisibility}
                            onVisibilityChange={setColumnVisibility}
                        />
                    </MuiBox>
                </CSSTransition>

                    <MuiBox sx={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <MaterialReactTable
                            columns={dynamicColumns}
                            data={data}
                            rowCount={rowCount}
                            state={{
                                isLoading: isLoading || isMappingLoading || (dynamicColumns.length === 0 && !isError && !mappingError && (data.length === 0 || rowCount === 0)),
                                showAlertBanner: isError || (!!mappingError && dynamicColumns.length === 0),
                                showProgressBars: isRefetching,
                                pagination, sorting, columnFilters, columnVisibility,
                            }}
                            manualPagination
                            manualSorting
                            manualFiltering
                            onPaginationChange={setPagination}
                            onSortingChange={setSorting}
                            onColumnFiltersChange={setColumnFilters}
                            onColumnVisibilityChange={setColumnVisibility}
                            enableColumnResizing
                            enableDensityToggle={false}
                            enableFullScreenToggle={false}
                            enableHiding
                            enableColumnOrdering
                            initialState={{
                                showColumnFilters: true, density: 'compact', pagination: { pageIndex: 0, pageSize: 10 },
                            }}
                            muiToolbarAlertBannerProps={
                                isError ? { color: 'error', children: 'Error loading data' }
                                    : (mappingError && dynamicColumns.length === 0) ? { color: 'error', children: `Mapping Error: ${mappingError}. Table may not function correctly.` }
                                        : undefined
                            }
                            renderTopToolbarCustomActions={() => (
                                <AntSpace>
                                    <AntTooltip title="Refresh Data & Schema">
                                        <AntButton
                                            type="text"
                                            icon={<SyncOutlined spin={isRefetching || isLoading || isMappingLoading} />}
                                            onClick={() => {
                                                fetchData(true);
                                            }}
                                        />
                                    </AntTooltip>
                                </AntSpace>
                            )}
                            columnFilterDisplayMode="popover"
                            columnFilterDebounceMs={500}
                            muiTablePaperProps={{
                                elevation: 0, sx: { borderRadius: '0px', border: 'none' }
                            }}
                        />
                    </MuiBox>

            </ThemeProvider>
        </MuiBox>
        </LocalizationProvider>

    );
};

export default LogsTable;