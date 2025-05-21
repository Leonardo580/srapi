import {Inject, Module} from '@nestjs/common';
import { SearchElasticUiService } from './search-elastic-ui.service';
import { SearchElasticUiController } from './search-elastic-ui.controller';
import ElasticSearchAPIConnector, {CloudHost} from "@elastic/search-ui-elasticsearch-connector";
import { ELASTICSEARCH_CLIENT } from '../elasticsearch/elasticsearch.module';
import * as fs from 'fs';
import * as path from 'path';
import {join} from "path";


const ElasticSearchAPIConnectorProvider = {
    provide: "ElasticSearchAPIConnector",
  useFactory: () => {
    // Path to your CA certificate
    const ca = fs.readFileSync(path.resolve(join("fresh_elk_docker/elastdocker/secrets/certs/ca/ca.crt")));
    return new ElasticSearchAPIConnector({
      host: "https://localhost:9200",
      index: ".ds-logs-generic*",
      apiKey: "b3pOSzJaWUJibDFDUTE2N3VTZmE6d0d6Z3c3Q25Tdy1QVXY4RjVVTHBJQQ==",
      connectionOptions: {
        headers: {
          "Content-Type": "application/json"
        }
      },

    });
  }
};

@Module({
  providers: [SearchElasticUiService, ElasticSearchAPIConnectorProvider],
  controllers: [SearchElasticUiController],
  exports: [SearchElasticUiService]
})
export class SearchElasticUiModule {}