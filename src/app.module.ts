import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config'
import { SearchModule } from './search/search.module';
import {ElasticsearchCustomModule} from "./elasticsearch/elasticsearch.module";


@Module({
  imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
      }),
      ElasticsearchCustomModule,
      SearchModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
