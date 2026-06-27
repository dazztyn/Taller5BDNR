import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongoModule } from './mongo/mongo.module';
import { RedisModule } from './redis/redis.module';
import { SensorModule } from './sensor/sensor.module';
import { EventosModule } from './eventos/eventos.module';

@Module({
  imports: [MongoModule, RedisModule, SensorModule, EventosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
