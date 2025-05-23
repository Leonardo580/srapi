import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_VisibilityState,
} from 'material-react-table';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box as MuiBox } from '@mui/material';
import { Button as AntButton, Space as AntSpace, Tooltip as AntTooltip, Spin, Alert, Popover as AntPopover, Tag as AntTag } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, SyncOutlined } from '@ant-design/icons';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { CSSTransition } from 'react-transition-group';
import { useLogsData, UseLogsDataReturn } from '@/hooks/useLogsData';
import ColumnManagerDnD, { ColumnDnDItem } from './ColumnManagerDnd';
import { FieldMappingInfo } from '@/utils/mappingHelper';


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
    additionalFilters?: DynamicFilterItem[];
}


const getStatusColor = (status: any): string => {
    const numericStatus = Number(status);
    if (isNaN(numericStatus)) return 'default';
    if (numericStatus >= 100 && numericStatus < 200) return 'processing';
    if (numericStatus >= 200 && numericStatus < 300) return 'success';
    if (numericStatus >= 300 && numericStatus < 400) return 'blue';
    if (numericStatus >= 400 && numericStatus < 500) return 'warning';
    if (numericStatus >= 500 && numericStatus < 600) return 'error';
    return 'default';
};
const getHttpMethodColor = (method: any): string => {
    const upperMethod = String(method ?? '').toUpperCase();
    switch (upperMethod) {
        case 'GET': return 'blue'; case 'POST': return 'green'; case 'PUT': return 'orange';
        case 'DELETE': return 'red'; case 'PATCH': return 'gold'; case 'OPTIONS': return 'purple';
        case 'HEAD': return 'cyan'; default: return 'default';
    }
};
const TruncatedTextCell: React.FC<{ text: string | null | undefined; maxLength?: number }> = ({ text, maxLength = 100 }) => {
    const fullText = String(text ?? '');
    if (fullText.length <= maxLength) return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fullText}</span>;
    const truncated = fullText.substring(0, maxLength) + "...";
    return (
        <AntSpace direction="vertical" align="start" style={{ width: '100%' }}>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{truncated}</span>
            <AntPopover
                content={<div style={{ maxWidth: '400px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fullText}</div>}
                title="Full Text" trigger="click" placement="bottomLeft"
            >
                <AntButton type="link" size="small" style={{ padding: 0, height: 'auto', lineHeight: 'normal' }}>Show More</AntButton>
            </AntPopover>
        </AntSpace>
    );
};
const getNestedValue = (path: string, obj: any): any => path.split('.').reduce((acc, part) => acc && acc[part], obj);
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


interface LogsTableActualProps {
    logDataHook: UseLogsDataReturn; // Pass the entire hook's return value
}

const LogsTable: React.FC<LogsTableActualProps> = ({ logDataHook }) => {
    const {
        data, rowCount, isLoading, isRefetching, isError,
        isMappingLoading, mappingError, processedMapping,
        fetchData,
        columnFilters, setColumnFilters,
        pagination, setPagination,
        sorting, setSorting,
    } = logDataHook;

    const [dynamicColumns, setDynamicColumns] = useState<MRT_ColumnDef<LogEntry>[]>([]);
    const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({});
    const [columnVisibilityInitialized, setColumnVisibilityInitialized] = useState(false);
    const [showColumnManager, setShowColumnManager] = useState(false);
    const animatedNodeRef = useRef(null);

    const getColumnFilterVariant = useCallback((fieldPath: string): MRT_ColumnDef<LogEntry>['filterVariant'] => {
        if (!processedMapping) return 'text';
        const mappingInfo = processedMapping[fieldPath];
        if (!mappingInfo) return 'text';
        switch (mappingInfo.type) {
            case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float': return 'range';
            case 'keyword': return fieldPath === 'level' ? 'select' : 'text';
            case 'ip': return 'text';
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
                const mappingInfo = processedMapping![path];
                const columnDef: MRT_ColumnDef<LogEntry> = {
                    id: path,
                    accessorFn: (originalRow) => getNestedValue(path, originalRow),
                    header: formatHeader(path),
                    enableColumnFilter: (mappingInfo && mappingInfo.type !== 'object' && mappingInfo.type !== 'nested'),
                };
                const CellRenderer: React.FC<{ value: any }> = ({ value }) => {
                    const httpStatusCodeField = 'http_status_code';
                    const httpMethodField = 'http_method';
                    if (path === 'message') return <TruncatedTextCell text={value} maxLength={120} />;
                    if (path === httpStatusCodeField) return <AntTag color={getStatusColor(value)}>{String(value ?? '')}</AntTag>;
                    if (path === httpMethodField) return <AntTag color={getHttpMethodColor(value)}>{String(value ?? '').toUpperCase()}</AntTag>;
                    if (path === '@timestamp' || mappingInfo?.type === 'date') {
                        try { return value ? new Date(value as string).toLocaleString() : ''; }
                        catch (e) { return String(value ?? ''); }
                    }
                    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
                    return String(value ?? '');
                };
                columnDef.Cell = ({ cell }) => <CellRenderer value={cell.getValue()} />;

                if (mappingInfo?.type === 'date') {
                    columnDef.Filter = ({ column }) => {
                        const filterValue = (column.getFilterValue() || [null, null]) as [Date | null, Date | null];
                        return (
                            <MuiBox sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, minWidth: '280px' }}>
                                <DateTimePicker label="Start" format="DD/MM/YYYY HH:mm" ampm={false}
                                                value={filterValue[0] ? dayjs(filterValue[0]) : null}
                                                onChange={(nv) => column.setFilterValue([nv?.toDate() ?? null, filterValue[1]])}
                                                slotProps={{ textField: { variant: 'standard', fullWidth: true } }} />
                                <DateTimePicker label="End" format="DD/MM/YYYY HH:mm" ampm={false}
                                                value={filterValue[1] ? dayjs(filterValue[1]) : null}
                                                onChange={(nv) => column.setFilterValue([filterValue[0], nv?.toDate() ?? null])}
                                                slotProps={{ textField: { variant: 'standard', fullWidth: true } }}
                                                minDateTime={filterValue[0] ? dayjs(filterValue[0]) : undefined} />
                            </MuiBox>
                        );
                    };
                } else {
                    columnDef.filterVariant = getColumnFilterVariant(path);
                }
                if (path === 'level' && mappingInfo?.type === 'keyword') {
                    columnDef.filterSelectOptions = [
                        { text: 'Error', value: 'error' }, { text: 'Warn', value: 'warn' },
                        { text: 'Info', value: 'info' }, { text: 'Debug', value: 'debug' },
                    ];
                } else if (path === 'message') columnDef.size = 350;
                return columnDef;
            });
    }, [processedMapping, getColumnFilterVariant]);

    useEffect(() => {
        if (data.length > 0 && processedMapping && (dynamicColumns.length === 0 )) {
            const newCols = generateColumns(data);
            setDynamicColumns(newCols);
        }
    }, [data, processedMapping, generateColumns, dynamicColumns.length]);


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

    const muiTheme = useMemo(() => createTheme({ palette: { mode: 'light' } }), []);
    const allColumnsForDnD: ColumnDnDItem[] = useMemo(() => {
        if (!dynamicColumns || dynamicColumns.length === 0) return [];
        return dynamicColumns.map(col => ({ id: col.id!, header: typeof col.header === 'string' ? col.header : col.id! }));
    }, [dynamicColumns]);

    if (isMappingLoading) return <MuiBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Loading field mapping..." /></MuiBox>;
    if (mappingError && (!processedMapping || Object.keys(processedMapping).length === 0)) return <MuiBox sx={{ p: 2 }}><Alert message="Critical Error" description={`Mapping: ${mappingError}`} type="error" showIcon /></MuiBox>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <MuiBox sx={{ p: 0, background: '#f0f2f5', minHeight: '100vh' }}>
                <ThemeProvider theme={muiTheme}>
                    <CssBaseline />
                    <MuiBox sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', background: '#fff', p: 2, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <AntButton type="default" icon={showColumnManager ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setShowColumnManager(p => !p)} disabled={dynamicColumns.length === 0}>
                            {showColumnManager ? 'Hide' : 'Show'} Columns
                        </AntButton>
                    </MuiBox>
                    <CSSTransition nodeRef={animatedNodeRef} in={showColumnManager && dynamicColumns.length > 0 && !!processedMapping} timeout={300} classNames="column-manager" unmountOnExit mountOnEnter>
                        <MuiBox ref={animatedNodeRef} sx={{ mb: 2, background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            <ColumnManagerDnD allPossibleColumns={allColumnsForDnD} currentVisibility={columnVisibility} onVisibilityChange={setColumnVisibility} />
                        </MuiBox>
                    </CSSTransition>
                    <MuiBox sx={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <MaterialReactTable
                            columns={dynamicColumns}
                            data={data}
                            rowCount={rowCount}
                            state={{
                                isLoading: isLoading || isMappingLoading,
                                showAlertBanner: isError || (!!mappingError && Object.keys(processedMapping || {}).length > 0 && dynamicColumns.length === 0),
                                showProgressBars: isRefetching,
                                pagination, sorting, columnFilters, columnVisibility,
                            }}
                            manualPagination manualSorting manualFiltering
                            onPaginationChange={setPagination}
                            onSortingChange={setSorting}
                            onColumnFiltersChange={setColumnFilters}
                            onColumnVisibilityChange={setColumnVisibility}
                            enableColumnResizing enableDensityToggle={false} enableFullScreenToggle={false} enableHiding enableColumnOrdering
                            initialState={{ showColumnFilters: true, density: 'compact' }}
                            muiToolbarAlertBannerProps={isError ? { color: 'error', children: 'Error loading data' } : (mappingError && dynamicColumns.length === 0 && Object.keys(processedMapping || {}).length > 0) ? { color: 'warning', children: `Mapping issue: ${mappingError}. Table may be incomplete.` } : undefined}
                            renderTopToolbarCustomActions={() => (
                                <AntSpace>
                                    <AntTooltip title="Refresh Data & Schema">
                                        <AntButton type="text" icon={<SyncOutlined spin={isRefetching || isLoading || isMappingLoading} />} onClick={() => fetchData(true)} />
                                    </AntTooltip>
                                </AntSpace>
                            )}
                            columnFilterDisplayMode="popover"
                            columnFilterDebounceMs={500}
                            muiTablePaperProps={{ elevation: 0, sx: { borderRadius: '0px', border: 'none' } }}
                        />
                    </MuiBox>
                </ThemeProvider>
            </MuiBox>
        </LocalizationProvider>
    );
};

export default LogsTable;