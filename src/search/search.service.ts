import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Client, estypes } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from '../elasticsearch/elasticsearch.module';

// Advanced search interface to support multiple filter types
export interface FieldFilter {
    // Support different types of filtering based on field type
    type: 'term' | 'range' | 'match' | 'prefix' | 'wildcard' | 'exists' | 'bool';
    field: string;
    value: any;
    operator?: 'AND' | 'OR';
    boost?: number;
}

export interface SearchOptions {
    // Pagination and sorting options
    page?: number;
    pageSize?: number;
    sortFields?: string[];
    sortOrder?: 'asc' | 'desc';

    // Advanced filtering
    filters?: FieldFilter[];

    // Global text search
    globalSearch?: {
        query: string;
        fields?: string[];
        fuzziness?: number;
    };
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        @Inject(ELASTICSEARCH_CLIENT)
        private readonly esClient: Client
    ) {}

    /**
     * Perform a flexible, type-agnostic search across an Elasticsearch index
     * @param indexName The name of the Elasticsearch index to search
     * @param options Search and filter options
     */
    async search<T = any>(
        indexName: string,
        options: SearchOptions = {}
    ): Promise<PaginatedResult<T>> {
        try {
            // Normalize pagination
            const page = Math.max(1, options.page || 1);
            const pageSize = Math.min(Math.max(1, options.pageSize || 10), 250);
            const from = (page - 1) * pageSize;

            // Build query components
            const queryComponents: estypes.QueryDslQueryContainer[] = [];

            // Handle global text search
            if (options.globalSearch) {
                const globalSearchQuery = this.buildGlobalSearchQuery(options.globalSearch);
                if (globalSearchQuery) {
                    queryComponents.push(globalSearchQuery);
                }
            }

            // Handle field-specific filters
            if (options.filters) {
                const filterQueries = this.buildFilterQueries(options.filters);
                queryComponents.push(...filterQueries);
            }

            // Construct the main query
            const finalQuery: estypes.QueryDslQueryContainer = {
                bool: {
                    must: queryComponents.length > 0 ? queryComponents : { match_all: {} }
                }
            };

            // Prepare sorting
            const sortOptions = this.prepareSortOptions(options);

            // Execute search
            const searchResponse = await this.esClient.search<T>({
                index: indexName,
                from,
                size: pageSize,
                query: finalQuery,
                sort: sortOptions,
                track_total_hits: true
            });

            // Process results
            const hits = searchResponse.hits.hits;
            const total = typeof searchResponse.hits.total === 'number'
                ? searchResponse.hits.total
                : searchResponse.hits.total?.value || 0;

            return {
                data: hits.map(hit => ({
                    _id: hit._id,
                    ...hit._source
                } as T)),
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            };
        } catch (error) {
            this.logger.error('Elasticsearch search error', error);
            throw new BadRequestException(`Search failed: ${error.message}`);
        }
    }

    /**
     * Build global text search query
     */
    private buildGlobalSearchQuery(
        globalSearch: NonNullable<SearchOptions['globalSearch']>
    ): estypes.QueryDslQueryContainer | null {
        if (!globalSearch.query) return null;

        return {
            multi_match: {
                query: globalSearch.query,
                fields: globalSearch.fields || ['*'],
                type: 'best_fields',
                fuzziness: globalSearch.fuzziness || 'AUTO'
            }
        };
    }

    /**
     * Build field-specific filter queries
     */
    private buildFilterQueries(
        filters: FieldFilter[]
    ): estypes.QueryDslQueryContainer[] {
        return filters.map(filter => {
            switch (filter.type) {
                case 'term':
                    return { term: { [filter.field]: filter.value } };
                case 'range':
                    return { range: { [filter.field]: filter.value } };

                case 'match':
                    return { match: { [filter.field]: filter.value } };

                case 'prefix':
                    return { prefix: { [filter.field]: filter.value } };

                case 'wildcard':
                    return { wildcard: { [filter.field]: filter.value } };

                case 'exists':
                    return { exists: { field: filter.field } };

                case 'bool':
                    return { bool: filter.value };

                default:
                    throw new BadRequestException(`Unsupported filter type: ${filter.type}`);
            }
        });
    }

    /**
     * Prepare sorting options
     */
    private prepareSortOptions(
        options: SearchOptions
    ): estypes.SortCombinations[] {
        // Default sort if no custom sorting is provided
        if (!options.sortFields || options.sortFields.length === 0) {
            return [{ _score: { order: 'desc' } }];
        }

        // Map provided sort fields to Elasticsearch sort format
        return options.sortFields.map(field => ({
            [field]: {
                order: options.sortOrder || 'desc',
                unmapped_type: 'keyword' // Fallback for unmapped fields
            }
        }));
    }

    /**
     * Utility method to create a field filter
     */
    createFieldFilter(
        field: string,
        value: any,
        type: FieldFilter['type'] = 'term'
    ): FieldFilter {
        return { field, value, type };
    }
}
