import { Test, TestingModule } from '@nestjs/testing';
import { SearchElasticUiController } from './search-elastic-ui.controller';

describe('SearchElasticUiController', () => {
  let controller: SearchElasticUiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchElasticUiController],
    }).compile();

    controller = module.get<SearchElasticUiController>(SearchElasticUiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
