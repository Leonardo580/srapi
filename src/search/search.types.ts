// Shared types between backend and frontend

export interface TimestampRange {
    gte?: string | number;
    lte?: string | number;
}

export type FieldFilterType =
    | 'term'
    | 'range'
    | 'match'
    | 'prefix'
    | 'wildcard'
    | 'exists'
    | 'bool';

export interface FieldFilter {
    type: FieldFilterType;
    field: string;
    value: any;
    operator?: 'AND' | 'OR';
    boost?: number;
}

export interface SearchOptions {
    page?: number;
    pageSize?: number;
    sortFields?: string[];
    sortOrder?: 'asc' | 'desc';
    filters?: FieldFilter[];
    globalSearch?: {
        query: string;
        fields?: string[];
        fuzziness?: number;
    };
    timestampRange?: TimestampRange;
    statusCodes?: (number | string)[];
    httpMethods?: string[];
    tags?: string[];
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}