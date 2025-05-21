import { Type } from 'class-transformer';
import {
    IsOptional,
    IsString,
    IsInt,
    Min,
    Max,
    IsArray,
    ValidateNested,
    IsEnum,
    IsObject,
    IsNumber,
} from 'class-validator';

// Corresponds to your ApiFieldFilter from the frontend Search UI connector's buildRequest
// This DTO should match what your Search UI `buildRequest` function sends.
export class SearchUiFieldFilterDto {
    @IsString()
    field: string;

    @IsString() // Or more specific if you know the types
    type: 'term' | 'range' | 'match' | 'prefix' | 'wildcard' | 'exists' | 'bool'; // Align with your supported types

    @IsOptional() // Value might not be present for 'exists'
    value: any; // Can be string, number, object for range {gte, lte}, or array

    @IsOptional()
    @IsEnum(['AND', 'OR'])
    operator?: 'AND' | 'OR';

    @IsOptional()
    @IsNumber()
    boost?: number;
}

export class SearchUiGlobalSearchDto {
    @IsString()
    query: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fields?: string[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(2) // Example range for fuzziness
    fuzziness?: number | string; // ES also accepts "AUTO"
}

export class SearchUiRequestDto {
    @IsOptional()
    @IsString()
    indexName?: string; // If you want to pass index dynamically

    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100) // Max page size
    pageSize?: number = 10;

    @IsOptional()
    @ValidateNested()
    @Type(() => SearchUiGlobalSearchDto)
    globalSearch?: SearchUiGlobalSearchDto;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SearchUiFieldFilterDto)
    filters?: SearchUiFieldFilterDto[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    sortFields?: string[];

    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    // Flag to indicate if aggregations are needed for facets
    @IsOptional()
    withAggregations?: boolean = true; // Default to true for Search UI
}