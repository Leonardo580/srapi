// src/hooks/useLogsData.ts
import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import dayjs from 'dayjs';
import ElasticService, {
    ApiSearchParams,
    FieldFilter as ApiFieldFilter,
    FieldFilterType,
} from '@/api/services/elasticService';
import { LogEntry, GlobalFilterState } from '@/components/LogsTable'; // Assuming types are co-located or imported
import { FieldMappingInfo } from '@/utils/mappingHelper';
import {
    MRT_ColumnFiltersState,
    MRT_PaginationState,
    MRT_SortingState,
} from 'material-react-table';

export interface UseLogsDataProps {
    initialGlobalFilters?: GlobalFilterState;
}

export interface UseLogsDataReturn {
    data: LogEntry[];
    rowCount: number;
    isLoading: boolean;
    isRefetching: boolean;
    isError: boolean;
    isMappingLoading: boolean;
    mappingError: string | null;
    processedMapping: Record<string, FieldMappingInfo> | null;
    fetchData: (forceColumnReset?: boolean) => Promise<void>;
    columnFilters: MRT_ColumnFiltersState;
    setColumnFilters: Dispatch<SetStateAction<MRT_ColumnFiltersState>>;
    pagination: MRT_PaginationState;
    setPagination: Dispatch<SetStateAction<MRT_PaginationState>>;
    sorting: MRT_SortingState;
    setSorting: Dispatch<SetStateAction<MRT_SortingState>>;
    // Expose globalFilters state and setter if form is to be managed outside directly
    // Or handle globalFilters internally if they are passed as an argument to fetchData/hook
    currentGlobalFilters: GlobalFilterState;
    setGlobalFilters: Dispatch<SetStateAction<GlobalFilterState>>;
}

export const useLogsData = (initialGlobalFilters: GlobalFilterState = {}): UseLogsDataReturn => {
    const [data, setData] = useState<LogEntry[]>([]);
    const [rowCount, setRowCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [isError, setIsError] = useState(false);

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<MRT_SortingState>([]);
    const [currentGlobalFilters, setGlobalFilters] = useState<GlobalFilterState>(initialGlobalFilters);

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
                    throw new Error("Mapping properties not found or empty.");
                }
                setProcessedMapping(properties[0]);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown mapping error.";
                setMappingError(errorMessage);
                setProcessedMapping({});
            } finally {
                setIsMappingLoading(false);
            }
        };
        fetchAndProcessMapping();
    }, []);

    const fetchData = useCallback(async (forceColumnReset = false) => {
        if (isMappingLoading) {
            return;
        }
        if (mappingError && !processedMapping) {
            setIsLoading(false);
            setIsRefetching(false);
            return;
        }

        const isInitialOrForced = forceColumnReset || (data.length === 0 && !isLoading);
        if (isInitialOrForced) {
            setIsLoading(true);
            setIsRefetching(false);
        } else {
            setIsRefetching(true);
            setIsLoading(false);
        }
        setIsError(false);

        const apiParams: ApiSearchParams = {
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
            sortFields: sorting.length > 0 ? sorting.map(s => s.id) : ['@timestamp'],
            sortOrder: sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'desc',
        };

        let allCombinedApiFilters: ApiFieldFilter[] = [];

        if (processedMapping) {
            const columnApiFiltersProcessed: ApiFieldFilter[] = columnFilters.map(mrtFilter => {
                const { id: fieldPath, value: mrtValue } = mrtFilter;
                const mappingInfo = processedMapping[fieldPath];
                let apiFilterValue: any = mrtValue;
                let apiFilterType: FieldFilterType = 'match';

                if (!mappingInfo) {
                    if (mrtValue === '' || mrtValue === null || mrtValue === undefined || (Array.isArray(mrtValue) && mrtValue.length === 0)) return null;
                    return { field: fieldPath, value: String(mrtValue), type: 'match' };
                }
                switch (mappingInfo.type) {
                    case 'date':
                        apiFilterType = 'range';
                        if (Array.isArray(mrtValue) && mrtValue.length === 2) {
                            const gte = mrtValue[0] ? (mrtValue[0] instanceof Date ? mrtValue[0].toISOString() : String(mrtValue[0])) : undefined;
                            const lte = mrtValue[1] ? (mrtValue[1] instanceof Date ? mrtValue[1].toISOString() : String(mrtValue[1])) : undefined;
                            if (!gte && !lte) return null;
                            apiFilterValue = { gte, lte };
                        } else { return null; }
                        break;
                    case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float':
                        apiFilterType = 'range';
                        if (Array.isArray(mrtValue) && mrtValue.length === 2) {
                            const gte = (mrtValue[0] !== null && String(mrtValue[0]).trim() !== '') ? Number(mrtValue[0]) : undefined;
                            const lte = (mrtValue[1] !== null && String(mrtValue[1]).trim() !== '') ? Number(mrtValue[1]) : undefined;
                            if (!gte && !lte) return null;
                            apiFilterValue = { gte, lte };
                            if ((apiFilterValue.gte !== undefined && isNaN(apiFilterValue.gte)) || (apiFilterValue.lte !== undefined && isNaN(apiFilterValue.lte))) return null;
                        } else if ( (typeof mrtValue === 'number' && !isNaN(mrtValue)) || (typeof mrtValue === 'string' && mrtValue.trim() !== '' && !isNaN(Number(mrtValue))) ) {
                            apiFilterType = 'term'; apiFilterValue = Number(mrtValue);
                        } else { return null; }
                        break;
                    case 'keyword': case 'constant_keyword': case 'ip':
                        apiFilterType = 'term';
                        if (Array.isArray(mrtValue) && mrtValue.length > 0) {
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
                if (apiFilterValue === '' || apiFilterValue === null || apiFilterValue === undefined || (Array.isArray(apiFilterValue) && apiFilterValue.length === 0)) return null;
                if (apiFilterType === 'range' && typeof apiFilterValue === 'object' && apiFilterValue.gte === undefined && apiFilterValue.lte === undefined) return null;
                return { field: fieldPath, value: apiFilterValue, type: apiFilterType };
            }).filter(f => f !== null) as ApiFieldFilter[];
            allCombinedApiFilters.push(...columnApiFiltersProcessed);

            if (currentGlobalFilters.mainSearch?.trim()) {
                allCombinedApiFilters.push({ field: 'message', value: currentGlobalFilters.mainSearch.trim(), type: 'match_phrase' });
            }
            if (currentGlobalFilters.level) {
                allCombinedApiFilters.push({ field: 'level', value: currentGlobalFilters.level, type: 'term' });
            }
            if (currentGlobalFilters.timestampRange) {
                const [start, end] = currentGlobalFilters.timestampRange;
                const gte = start?.toISOString();
                const lte = end?.toISOString();
                if (gte || lte) allCombinedApiFilters.push({ field: '@timestamp', value: { gte, lte }, type: 'range' });
            }
            currentGlobalFilters.additionalFilters?.forEach(dynFilter => {
                if (!dynFilter.field || dynFilter.value === undefined || dynFilter.value === null) return;
                const fieldInfo = processedMapping[dynFilter.field];
                if (!fieldInfo) {
                    const valStr = typeof dynFilter.value === 'object' ? JSON.stringify(dynFilter.value) : String(dynFilter.value);
                    if (valStr.trim() === '' || valStr === '{}' || valStr === '[]') return;
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
                            if (!gte && !lte) return; dynamicApiValue = { gte, lte };
                        } else { return; }
                        break;
                    case 'ip':
                        dynamicApiType = 'range';
                        if (typeof dynFilter.value === 'object' && dynFilter.value !== null) {
                            const gte = (dynFilter.value as any).from?.trim() || undefined;
                            const lte = (dynFilter.value as any).to?.trim() || undefined;
                            if (!gte && !lte) return; dynamicApiValue = { gte, lte };
                        } else { return; }
                        break;
                    case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float': case 'scaled_float':
                        dynamicApiValue = Number(dynFilter.value); if (isNaN(dynamicApiValue)) return; dynamicApiType = 'term'; break;
                    case 'boolean': dynamicApiValue = dynFilter.value; dynamicApiType = 'term'; break;
                    case 'keyword': dynamicApiValue = String(dynFilter.value); dynamicApiType = 'term'; break;
                    case 'text': dynamicApiValue = String(dynFilter.value); dynamicApiType = 'match'; break;
                    default: if (String(dynFilter.value).trim() === '') return; dynamicApiValue = String(dynFilter.value); dynamicApiType = 'match';
                }
                allCombinedApiFilters.push({ field: dynFilter.field, value: dynamicApiValue, type: dynamicApiType });
            });
        }

        if (allCombinedApiFilters.length > 0) {
            apiParams.filters = allCombinedApiFilters;
        }

        try {
            const result = await ElasticService.getData(apiParams.page, apiParams.pageSize, {
                sortFields: apiParams.sortFields, sortOrder: apiParams.sortOrder, filters: apiParams.filters,
            });
            setData(result.data);
            setRowCount(result.total);
        } catch (error) {
            setIsError(true);
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, [
        isMappingLoading, mappingError, processedMapping,
        pagination, sorting, columnFilters, currentGlobalFilters,
        data.length, isLoading // Added data.length and isLoading to manage initial vs refetch correctly
    ]);

    useEffect(() => {
        if (!isMappingLoading && (processedMapping || mappingError)) {
            fetchData();
        }
    }, [isMappingLoading, mappingError, processedMapping, fetchData]);


    return {
        data,
        rowCount,
        isLoading,
        isRefetching,
        isError,
        isMappingLoading,
        mappingError,
        processedMapping,
        fetchData,
        columnFilters,
        setColumnFilters,
        pagination,
        setPagination,
        sorting,
        setSorting,
        currentGlobalFilters,
        setGlobalFilters
    };
};