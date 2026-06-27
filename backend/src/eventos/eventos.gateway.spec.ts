import { Test, TestingModule } from '@nestjs/testing';
import { EventosGateway } from './eventos.gateway';

describe('EventosGateway', () => {
  let gateway: EventosGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventosGateway],
    }).compile();

    gateway = module.get<EventosGateway>(EventosGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
