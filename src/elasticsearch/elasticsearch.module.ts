import {Module, Global} from "@nestjs/common";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {Client} from "@elastic/elasticsearch";
import { readFileSync } from 'fs';
import { join } from "path";
export const ELASTICSEARCH_CLIENT = "ELASTICSEARCH_CLIENT";

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: ELASTICSEARCH_CLIENT,
            useFactory: (configService: ConfigService) => {
                const node = configService.get<string>('ELASTICSEARCH_NODE');
                const username = configService.get<string>('ELASTICSEARCH_USERNAME');
                const password = configService.get<string>('ELASTICSEARCH_PASSWORD');
                if (username && password)
                    return new Client({
                        node: node,
                        auth: {
                            "username" : username,
                            "password": password
                        },
                        tls : {
                            ca : readFileSync(join("fresh_elk_docker/elastdocker/secrets/certs/ca/ca.crt")),
                            rejectUnauthorized: true

                        },
                    });
                else
                    return new Client(
                        {
                            node: node
                        }
                    );
            },
            inject: [ConfigService]
        }
    ],
    exports: [ELASTICSEARCH_CLIENT]
})
export class ElasticsearchCustomModule{

}