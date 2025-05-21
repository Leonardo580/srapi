import {
    Controller,
    Post,
    Body,
    Param,
    ValidationPipe,
    UsePipes,
    Query,
    ParseIntPipe,
    DefaultValuePipe,
    HttpStatus,
    Logger,
    NotFoundException,
    BadRequestException, Get,
} from '@nestjs/common';
import {
    SearchService,
    SearchOptions,
    PaginatedResult,
} from './search.service'; // Adjust path if needed
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import {SearchUiRequestDto} from "./dto/search-ui-request.dto"; // For API documentation


@ApiTags('Search') // Group endpoints in Swagger UI
@Controller('search')
export class SearchController {
    private readonly logger = new Logger(SearchController.name);

    constructor(private readonly searchService: SearchService) {
    }

    @Post(':indexName')
    @ApiOperation({
        summary: 'Perform a search on a specific Elasticsearch index',
        description:
            'Executes a flexible search query against the specified index, supporting pagination, sorting, filtering, and global text search.',
    })
    @ApiParam({
        name: 'indexName',
        required: true,
        description: 'The name of the Elasticsearch index to search',
        example: 'products',
    })
    @ApiBody({
        description: 'Search options including filters, pagination, and sorting',
        type: 'object', // Use a DTO class here if you define one
        // Providing an example helps consumers understand the structure
        examples: {
            basic: {
                summary: 'Basic Pagination',
                value: {page: 1, pageSize: 20} satisfies SearchOptions
            },
            withGlobalSearch: {
                summary: 'Global Search',
                value: {
                    page: 1,
                    pageSize: 10,
                    globalSearch: {query: 'laptop', fields: ['name', 'description']},
                } satisfies SearchOptions
            },
            withFilters: {
                summary: 'Filtering',
                value: {
                    page: 1,
                    pageSize: 10,
                    filters: [
                        {type: 'term', field: 'category.keyword', value: 'Electronics'},
                        {type: 'range', field: 'price', value: {gte: 100, lte: 500}}
                    ]
                } satisfies SearchOptions
            },
            withSorting: {
                summary: 'Sorting',
                value: {
                    page: 1,
                    pageSize: 10,
                    sortFields: ['price'],
                    sortOrder: 'asc',
                } satisfies SearchOptions
            },
            complex: {
                summary: 'Complex Query',
                value: {
                    page: 1,
                    pageSize: 10,
                    globalSearch: {query: "powerful gaming", fields: ["name", "description"], fuzziness: 1},
                    filters: [
                        {type: "term", field: "brand.keyword", value: "AwesomeBrand"},
                        {type: "range", field: "rating", value: {gte: 4.5}},
                    ],
                    sortFields: ["rating", "price"],
                    sortOrder: "desc"
                } satisfies SearchOptions
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Search results retrieved successfully.',
        // You might want to define a schema for PaginatedResult<any> or a specific type
        // For now, describing it generally.
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        data: {type: 'array', items: {type: 'object'}},
                        total: {type: 'number'},
                        page: {type: 'number'},
                        pageSize: {type: 'number'},
                        totalPages: {type: 'number'},
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid search options or index name provided.',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'The specified index does not exist (or other ES not found error).',
    })
    @ApiResponse({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        description: 'An unexpected error occurred during the search.',
    })
    // Apply validation pipe if using class-validator DTOs for the body
    // @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async performSearch(
        @Param('indexName') indexName: string,
        @Body() searchOptions: SearchOptions, // Use DTO here if defined
    ): Promise<PaginatedResult<any>> { // Using 'any' as controller doesn't know specific index structure
        this.logger.log(`Received search request for index: ${indexName}`);
        this.logger.debug(`Search options: ${JSON.stringify(searchOptions)}`);

        if (!indexName || indexName.trim() === '') {
            throw new BadRequestException('Index name cannot be empty.');
        }

        try {
            // The SearchService already handles potential ES errors and throws BadRequestException
            const results = await this.searchService.search<any>(
                indexName,
                searchOptions,
            );
            this.logger.log(`Search successful for index: ${indexName}. Found ${results.total} items.`);
            return results;
        } catch (error) {
            // Catch specific Elasticsearch errors if needed for different HTTP statuses
            if (error?.meta?.body?.error?.type === 'index_not_found_exception') {
                this.logger.warn(`Search failed: Index not found - ${indexName}`);
                throw new NotFoundException(`Index '${indexName}' not found.`);
            }
            // Re-throw BadRequestExceptions from the service or other unexpected errors
            this.logger.error(`Search failed for index ${indexName}: ${error.message}`, error.stack);
            // Let NestJS handle the exception (will likely be 500 if not BadRequest/NotFound)
            throw error;
        }
    }
    @Get("mapping/:index_name")
    async mappings(@Param("index_name") indexName: string)  {
        if (indexName.trim() === '')
            throw new BadRequestException('Index name cannot be empty.');
        try {
            return this.searchService.mapping(indexName);
        }catch (e) {
            this.logger.error(`Something bad happened during mapping: ${e.message}`);
            throw new BadRequestException("Something went wrong");
        }

    }

    @Post('search-ui/:indexPattern') // Or just '/search-ui' if index is in DTO
    @UsePipes(new ValidationPipe({transform: true, whitelist: true, forbidNonWhitelisted: true}))
    @ApiOperation({
        summary: 'Perform a search optimized for Elastic Search UI',
        description: 'Accepts Search UI state and returns results with aggregations for facets.',
    })
    @ApiParam({
        name: 'indexPattern',
        required: true,
        description: 'Elasticsearch index pattern (e.g., .ds-logs-generic-*)',
        example: '.ds-logs-generic-*'
    })
    @ApiBody({type: SearchUiRequestDto})
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Search results with aggregations.' /* Define schema if desired */
    })
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: 'Invalid search parameters.'})
    async performSearchUiSearch(
        @Param('indexPattern') indexPattern: string, // Get index pattern from URL
        @Body() searchUiDto: SearchUiRequestDto,
    ): Promise<any> {
        this.logger.log(`Received Search UI request for index pattern: ${indexPattern}`);
        this.logger.debug(`Search UI DTO: ${JSON.stringify(searchUiDto)}`);

        if (!indexPattern || indexPattern.trim() === '') {
            throw new BadRequestException('Index pattern cannot be empty.');
        }

        // The DTO already handles default for page and pageSize
        // The service will perform further validation/clamping

        try {
            // The DTO has 'indexName' as optional if you prefer to pass it in body
            // const targetIndex = searchUiDto.indexName || '.ds-logs-generic-*'; // Default index
            const results = await this.searchService.searchForSearchUi<any>(
                indexPattern, // Use indexPattern from URL param
                searchUiDto,
            );
            this.logger.log(`Search UI search successful for ${indexPattern}. Found ${results.total} items.`);
            return results;
        } catch (error) {
            // Service should throw BadRequestException for known issues
            // Log other errors and let NestJS handle them (usually 500)
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Search UI search failed for ${indexPattern}: ${error.message}`, error.stack);
            throw new BadRequestException(`An unexpected error occurred during search: ${error.message}`);
        }
    }
}