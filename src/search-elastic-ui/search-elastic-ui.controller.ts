import {Body, Controller, Inject, Post} from '@nestjs/common';
import {SearchElasticUiService} from "./search-elastic-ui.service";

@Controller()
export class SearchElasticUiController {
    constructor( private readonly searchService: SearchElasticUiService) {
    }
    @Post("/search")
    async searchElasticUI(@Body() createSearchDto: any ){
        const {state, queryConfig } = createSearchDto;
        return await this.searchService.performSearch(state, queryConfig);
    }
    @Post("/autocomplete")
    async autocomplete(@Body() createSearchDto: any ){
        const {state, queryConfig} = createSearchDto;
        return await this.searchService.performAutoComplete(state, queryConfig);
    }
}
