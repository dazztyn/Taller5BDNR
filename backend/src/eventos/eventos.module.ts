import { Module } from '@nestjs/common';
import { EventosGateway } from './eventos.gateway';

@Module({
  providers: [EventosGateway]
})
export class EventosModule {}
