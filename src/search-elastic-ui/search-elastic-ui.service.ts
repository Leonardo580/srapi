import {Injectable, OnModuleInit, Logger, Inject} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import ElasticSearchAPIConnector, {CloudHost} from "@elastic/search-ui-elasticsearch-connector";
import {ELASTICSEARCH_CLIENT} from "../elasticsearch/elasticsearch.module";

@Injectable()
export class SearchElasticUiService  {
    private readonly logger = new Logger(SearchElasticUiService.name);

    constructor(@Inject("ElasticSearchAPIConnector") private readonly apiElasticConnector : ElasticSearchAPIConnector ) {
    }

    async performSearch(state: any, queryConfig: any): Promise<any> {
        if (!this.apiElasticConnector) {
            throw new Error('Searchkit client not initialized');
        }



            // Create a mock Express Request object
            const timeout = {timeout: 60000};
            Object.assign(queryConfig, timeout);
            const tmp = await this.apiElasticConnector.onSearch(state, queryConfig);
            this.logger.debug(tmp);
            return tmp;

    }
    async performAutoComplete(state: any, queryConfig: any): Promise<any> {
        if (!this.apiElasticConnector) {
            throw new Error('Searchkit client not initialized');
        }
        try{
            return this.apiElasticConnector.onAutocomplete(state, queryConfig);
        }catch(error){
            this.logger.error('autocomplete failed', error.stack)
            throw error;
        }
    }
}