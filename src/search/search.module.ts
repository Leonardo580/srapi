import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchElasticUiModule } from '../search-elastic-ui/search-elastic-ui.module';

@Module({
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
