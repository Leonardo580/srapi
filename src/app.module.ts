import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config'
import { SearchModule } from './search/search.module';
import {ElasticsearchCustomModule} from "./elasticsearch/elasticsearch.module";
import {SearchElasticUiModule} from "./search-elastic-ui/search-elastic-ui.module";


@Module({
  imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
      }),
      ElasticsearchCustomModule,
      SearchModule,
      SearchElasticUiModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
