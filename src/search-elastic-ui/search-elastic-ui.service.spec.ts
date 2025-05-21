import { Test, TestingModule } from '@nestjs/testing';
import { SearchElasticUiService } from './search-elastic-ui.service';

describe('SearchElasticUiService', () => {
  let service: SearchElasticUiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchElasticUiService],
    }).compile();

    service = module.get<SearchElasticUiService>(SearchElasticUiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
