import { Module } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { SensorController } from './sensor.controller';
import { MongoModule } from '../mongo/mongo.module';
import { RedisModule } from '../redis/redis.module';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [MongoModule, RedisModule, EventosModule],
  controllers: [SensorController],
  providers: [SensorService],
})
export class SensorModule {}
