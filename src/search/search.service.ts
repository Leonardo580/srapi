import {Injectable, Inject, Logger, BadRequestException, NotFoundException} from '@nestjs/common';
import { Client, estypes } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from '../elasticsearch/elasticsearch.module';
import { SearchUiRequestDto } from './dto/search-ui-request.dto';

// Advanced search interface to support multiple filter types
export interface SearchUiPaginatedResult<T> extends PaginatedResult<T> {
    aggregations?: estypes.AggregationsAggregate | null;
}

// Define a more specific type for the structure of configuredFacets
interface FacetConfiguration {
    type: 'value' | 'range'; // Add other types if needed
    size?: number;
    ranges?: Array<{ from?: string | number; to?: string | number; key?: string }>; // For range facets
    // Add other facet config properties if necessary
}

interface ConfiguredFacetsMap {
    [key: string]: FacetConfiguration;
}


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

    async mapping(indexName: string): Promise<estypes.MappingTypeMapping> {
        const exists = await this.esClient.indices.exists({index: indexName})

        if (! exists) {
            throw new BadRequestException("Index Not Found")
        }
        try {
            const response = await this.esClient.indices.getMapping({index: indexName});
            this.logger.debug(response)
            return response;
        }catch (e) {
            throw new Error(`Could not find mapping for index: ${indexName}: ${e.message}`);
        }
    }

    async searchForSearchUi<T = any>(
        indexPattern: string,
        options: SearchUiRequestDto,
    ): Promise<SearchUiPaginatedResult<T>> {
        try {
            const page = Math.max(1, options.page || 1);
            const pageSize = Math.min(Math.max(1, options.pageSize || 10), 250);
            const from = (page - 1) * pageSize;

            const queryComponents: estypes.QueryDslQueryContainer[] = [];

            if (options.globalSearch && options.globalSearch.query) {
                const globalSearchQuery = this.buildGlobalSearchQuery({
                    query: options.globalSearch.query,
                    fields: options.globalSearch.fields,
                    // fuzziness: typeof options.globalSearch.fuzziness === 'number' ? options.globalSearch.fuzziness! : ((options.globalSearch.fuzziness!) as string), // Allow string for "AUTO"
                });
                if (globalSearchQuery) queryComponents.push(globalSearchQuery);
            }

            if (options.filters && options.filters.length > 0) {
                const internalFilters: FieldFilter[] = options.filters.map(f => ({
                    type: f.type as FieldFilter['type'],
                    field: f.field,
                    value: f.value,
                    operator: f.operator,
                    boost: f.boost,
                }));
                const filterQueries = this.buildFilterQueries(internalFilters);
                queryComponents.push(...filterQueries);
            }

            const finalQuery: estypes.QueryDslQueryContainer = {
                bool: {
                    must: queryComponents.length > 0 ? queryComponents : { match_all: {} },
                }
            };

            const sortOptions = this.prepareSortOptions({
                sortFields: options.sortFields,
                sortOrder: options.sortOrder,
            });

            // FIX for Error 1: `aggregations` property in esClient.search expects Record<string, estypes.AggregationsAggregationContainer>
            // The `buildSearchUiAggregations` method should return this type.
            let aggregationsQueryDsl: Record<string, estypes.AggregationsAggregationContainer> | undefined = undefined;
            if (options.withAggregations !== false) { // Check for explicit false, default to true
                aggregationsQueryDsl = this.buildSearchUiAggregations(options);
            }

            this.logger.debug(`Executing ES Search on ${indexPattern} with query: ${JSON.stringify(finalQuery)} and aggs: ${JSON.stringify(aggregationsQueryDsl)}`);

            const searchResponse = await this.esClient.search<T>({
                index: indexPattern,
                from,
                size: pageSize,
                query: finalQuery,
                sort: sortOptions,
                aggregations: aggregationsQueryDsl, // Correctly typed now
                track_total_hits: true,
            });

            const hits = searchResponse.hits.hits;
            const total = typeof searchResponse.hits.total === 'number'
                ? searchResponse.hits.total
                : searchResponse.hits.total?.value || 0;

            return {
                data: hits.map(hit => ({ _id: hit._id, ...hit._source } as T)),
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
                aggregations: searchResponse.aggregations || null,
            };
        } catch (error) {
            this.logger.error(`Elasticsearch SearchUI search error on index ${indexPattern}`, error.meta?.body || error.message);
            if (error.meta?.body?.error?.type === 'index_not_found_exception') {
                throw new BadRequestException(`Index pattern '${indexPattern}' not found or did not match any indices.`);
            }
            throw new BadRequestException(`Search failed: ${error.message || JSON.stringify(error.meta?.body?.error)}`);
        }
    }

    private buildSearchUiAggregations(
        options: SearchUiRequestDto,
    ): Record<string, estypes.AggregationsAggregationContainer> | undefined { // FIX: Correct return type
        // FIX for Error 2 & 3 & 4: Type `aggs` correctly and handle `configuredFacets` access
        const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};

        // This should ideally be driven by the `searchUiConfig.searchQuery.facets`
        // from the frontend or mirrored here.
        const configuredFacets: ConfiguredFacetsMap = { // Use the new interface
            level: { type: "value", size: 10 },
            client_ip: { type: "value", size: 10 },
            // "@timestamp": {
            //   type: "range",
            //   ranges: [ /* define ranges */ ]
            // }
        };

        // Iterate safely over the keys of configuredFacets
        (Object.keys(configuredFacets) as Array<keyof typeof configuredFacets>).forEach(fieldName => {
            const facetConfig = configuredFacets[fieldName]; // Now fieldName is correctly typed

            if (facetConfig.type === 'value') {
                aggs[fieldName] = { // Now fieldName is a keyof configuredFacets
                    terms: {
                        field: `${fieldName}.keyword`,
                        size: facetConfig.size || 10,
                    },
                };
            } else if (facetConfig.type === 'range' && facetConfig.ranges) {
                aggs[fieldName] = {
                    date_range: {
                        field: fieldName.toString(), // fieldName is "level" | "client_ip", ensure it's string for ES field
                        ranges: facetConfig.ranges.map(r => ({ from: r.from, to: r.to, key: r.key })),
                    }
                };
            }
        });

        return Object.keys(aggs).length > 0 ? aggs : undefined;
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
