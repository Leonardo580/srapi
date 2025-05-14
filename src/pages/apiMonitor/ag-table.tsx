// src/components/LogsTable.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_PaginationState,
    type MRT_SortingState,
    type MRT_ColumnFiltersState,
} from 'material-react-table';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import ElasticService, {
    ApiSearchParams,
    PaginatedResponse,
    FieldFilter as ApiFieldFilter,
    FieldFilterType,
} from '@/api/services/elasticService.ts'; // Adjust path

// Your LogEntry interface (same as before)
export interface LogEntry {
    _id: string;
    '@timestamp': string;
    message: string;
    level: string;
    client_ip?: string;
    [key: string]: any;
}

const LogsTable: React.FC = () => {
    // Data and MuiTable state
    const [data, setData] = useState<LogEntry[]>([]);
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false); // For manual refresh
    const [rowCount, setRowCount] = useState(0);

    // Table state
    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<MRT_SortingState>([]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    // Fetch data function
    const fetchData = async () => {
        if (!data.length) setIsLoading(true); // Full page load
        else setIsRefetching(true); // Subsequent fetches (e.g., sort, filter, refresh)

        const apiParams: ApiSearchParams = {
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
        };

        // Sorting
        if (sorting.length > 0) {
            apiParams.sortFields = sorting.map(s => s.id);
            apiParams.sortOrder = sorting[0].desc ? 'desc' : 'asc';
        } else {
            apiParams.sortFields = ['@timestamp']; // Default sort
            apiParams.sortOrder = 'desc';
        }

        // Filtering
        const activeColumnFilters: ApiFieldFilter[] = columnFilters
            .map(filter => {
                let type: FieldFilterType = 'match'; // Default
                const { id, value } = filter;

                // Heuristics for filter type based on MRT filter value
                // MRT text filters provide string values
                // MRT select/multi-select provide string or array of strings
                // MRT range filters provide [min, max] array

                if (id === 'level') { // 'level' uses a select filter variant
                    type = 'term';
                } else if (id.endsWith('.keyword') || id === 'client_ip') {
                    type = 'term';
                } else if (id === '@timestamp') {
                    // If using MRT 'date-range' filter, value would be [Date, Date]
                    // We'd need to format these to strings for ES and set type = 'range'
                    // For now, assuming text input for timestamp or specific handling.
                    // This part might need adjustment based on how you configure timestamp filter in MRT
                    if (Array.isArray(value) && value.length === 2 && value.every(v => v instanceof Date)) {
                        type = 'range';
                        return {
                            field: id,
                            value: {
                                gte: (value[0] as Date).toISOString(),
                                lte: (value[1] as Date).toISOString(),
                            },
                            type,
                        };
                    } else if (typeof value === 'string' && value.includes('to')) {
                        // Handle custom range input like "2023-01-01 to 2023-01-31"
                        const [gte, lte] = value.split('to').map(s => s.trim());
                        if (gte && lte) {
                            type = 'range';
                            return { field: id, value: { gte, lte }, type };
                        }
                    }
                    // else falls through to 'match' if just a string
                }

                // For generic text filters, assume 'match'
                // If value is an array (e.g. from multi-select), your backend needs to handle it
                // or you need to create multiple 'term' filters with OR if your backend 'term' expects single value.
                // For simplicity, this example assumes single value or backend handles array for 'match'.
                return {
                    field: id,
                    value: value, // MRT passes the direct value
                    type: type,
                };
            })
            .filter(f => f.value !== '' && f.value !== null && f.value !== undefined && (!Array.isArray(f.value) || (f.value as any[]).length > 0));


        if (activeColumnFilters.length > 0) {
            apiParams.filters = activeColumnFilters;
        }

        try {
            const result = await ElasticService.getData(
                apiParams.page,
                apiParams.pageSize,
                {
                    sortFields: apiParams.sortFields,
                    sortOrder: apiParams.sortOrder,
                    filters: apiParams.filters,
                }
            );
            setData(result.data);
            setRowCount(result.total);
            setIsError(false);
        } catch (error) {
            setIsError(true);
            console.error('Failed to fetch logs:', error);
            // Optionally set error message to display in table banner
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    };


    // Trigger fetchData on state changes
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        sorting,
        columnFilters,
    ]);


    const columns = useMemo<MRT_ColumnDef<LogEntry>[]>(
        () => [
            {
                accessorKey: '@timestamp',
                header: 'Timestamp',
                Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString(),
                enableColumnFilter: true, // Enable filter UI
                // Example for date range filter (MRT specific)
                // filterVariant: 'date-range',
                //muiFilterDatePickerProps: {
                //    // MUI DatePicker props
                //},
            },
            {
                accessorKey: 'message',
                header: 'Message',
                enableColumnFilter: true,
            },
            {
                accessorKey: 'level',
                header: 'Level',
                filterVariant: 'select', // Use a select dropdown for filtering
                filterSelectOptions: [ // Options for the select
                    { text: 'Error', value: 'error' },
                    { text: 'Warn', value: 'warn' },
                    { text: 'Info', value: 'info' },
                    { text: 'Debug', value: 'debug' },
                ],
                // For client-side select, you'd provide the options here.
                // For server-side, these are just for UI.
            },
            {
                accessorKey: 'client_ip',
                header: 'Client IP',
                enableColumnFilter: true,
            },
            // Example for nested field:
            // {
            //   accessorFn: (originalRow) => originalRow.host?.name, // get value from nested object
            //   id: 'host.name', //id is still required when using accessorFn instead of accessorKey
            //   header: 'Host Name',
            //   enableColumnFilter: true,
            // },
        ],
        []
    );

    const muiTheme = useMemo(() => createTheme({
        // Your MUI theme customizations
        palette: {
            mode: 'light', // or 'dark'
        },
    }), []);


    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline /> {/* Ensures baseline Material UI styles */}
            <MaterialReactTable
                columns={columns}
                data={data}
                rowCount={rowCount}
                // State Management
                state={{
                    isLoading,
                    showAlertBanner: isError,
                    showProgressBars: isRefetching, // Show progress bar during refetches
                    pagination,
                    sorting,
                    columnFilters,
                }}
                // Server-side Features
                manualPagination
                manualSorting
                manualFiltering
                // Event Handlers
                onPaginationChange={setPagination}
                onSortingChange={setSorting}
                onColumnFiltersChange={setColumnFilters}
                // Features
                enableColumnResizing
                enableDensityToggle={false} // Optional: disable density toggle
                enableFullScreenToggle={false} // Optional
                // Initial State
                initialState={{
                    showColumnFilters: true, // Show filters by default
                    density: 'compact',
                    pagination: { pageIndex: 0, pageSize: 10 }, // Matches our useState
                }}
                // Customization
                muiToolbarAlertBannerProps={
                    isError
                        ? { color: 'error', children: 'Error loading data' }
                        : undefined
                }
                // Top Toolbar Actions (e.g., Refresh button)
                renderTopToolbarCustomActions={() => (
                    <Tooltip arrow title="Refresh Data">
                        <IconButton onClick={() => fetchData()}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                )}
                // You can further customize table, cell, row, etc. props using mui...Props
                // e.g., muiTableHeadCellProps, muiTableBodyRowProps
                columnFilterDisplayMode="popover" // or 'subheader'
                // MRT has built-in debouncing for text filters
                columnFilterDebounceMs={500} // Default is 500ms
            />
        </ThemeProvider>
    );
};

export default LogsTable;