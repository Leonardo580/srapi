import axios from 'axios';

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Define filter types to match backend
export type FieldFilterType = 'term' | 'range' | 'match' | 'prefix' | 'wildcard' | 'exists' | 'bool';

export interface FieldFilter {
    type: FieldFilterType;
    field: string;
    value: any;
    operator?: 'AND' | 'OR'; // Note: 'operator' isn't directly used by your current backend service for individual filters
    boost?: number;
}

// Comprehensive search parameters interface
export interface ApiSearchParams {
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
}

const DEFAULT_INDEX = import.meta.env.VITE_ELASTICSEARCH_DEFAULT_INDEX;
class ElasticService {
    private baseUrl: string;
    private readonly URL_FIELD_TO_EXCLUDE = 'url'; // Or 'url', or whatever your primary URL field is

    constructor(baseUrl: string = '/elasticsearch/search') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generic search method that matches the backend service.
     * It now implicitly adds global filters.
     * @param indexName Elasticsearch index to search
     * @param params Search parameters
     */
    async search<T = any>(
        indexName: string,
        params: ApiSearchParams = {}
    ): Promise<PaginatedResponse<T>> {
        // 1. Create the mandatory filters
        const mandatoryBaseFilters: FieldFilter[] = [
            {
                type: 'exists',
                field: 'client_ip',
                value: null, // Value is not used for 'exists' type in your backend, but field is key
            },
            {
                type: 'bool', // We'll use a "bool" query with "must_not"
                field: this.URL_FIELD_TO_EXCLUDE, // Contextual field name, not directly used in bool this way by ES
                value: { // This is the Elasticsearch bool query structure
                    must_not: [
                        {
                            wildcard: {
                                [this.URL_FIELD_TO_EXCLUDE]: '*/explorer*'
                            }
                        }
                    ]
                }
            }
        ];

        // 2. Merge with existing filters from params
        const combinedFilters = [
            ...mandatoryBaseFilters,
            ...(params.filters || [])
        ];

        // 3. Create the final parameters object
        const finalParams: ApiSearchParams = {
            ...params,
            filters: combinedFilters,
        };

        try {
            const response = await axios.post<PaginatedResponse<T>>(
                `${this.baseUrl}/${indexName}`, // Ensure this endpoint matches your NestJS controller
                finalParams
            );
            return response.data;
        } catch (error) {
            // Improved error logging
            if (axios.isAxiosError(error)) {
                console.error('Elasticsearch API error:', error.response?.status, error.response?.data, error.config?.url, error.config?.data);
                if (error.response?.data) {
                    throw new Error(`Search failed: ${error.response.data.message || JSON.stringify(error.response.data)} (Status: ${error.response.status})`);
                }
            }
            console.error('Elasticsearch search error (non-API or network issue):', error);
            throw error; // Re-throw the original error or a more specific one
        }
    }

    /**
     * Convenience method for logs search.
     * This will also include the mandatory filters via the main search method.
     */
    async getData(
        page: number = 1,
        pageSize: number = 25,
        // Pass through any additional searchParams which might include other filters, sorting, etc.
        searchParams: Omit<ApiSearchParams, 'page' | 'pageSize'> = {} // Omit page/pageSize as they are direct params
    ): Promise<PaginatedResponse<any>> { // Consider using a specific LogType instead of 'any'
        return this.search('.ds-logs-generic-*', { // Default index pattern
            page,
            pageSize,
            ...searchParams // Spread any other search options like custom filters, sort, globalSearch
        });
    }
    async getMapping(indexName = DEFAULT_INDEX) {
        try{
            return (await axios.get(`${this.baseUrl}/mapping/${indexName}`)).data;
        }catch (e) {
            if (axios.isAxiosError(e)) {
                console.error('Elasticsearch API error:', e);
            }
            console.log("Elasticsearch search error (non-API or network issue):", e);
            throw e;
        }
    }
    /**
     * Utility method to create field filters (remains unchanged)
     */
    createFieldFilter(
        field: string,
        value: any,
        type: FieldFilterType = 'term'
    ): FieldFilter {
        return { field, value, type };
    }
}

export default new ElasticService();