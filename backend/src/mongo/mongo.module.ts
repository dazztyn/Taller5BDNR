import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sensor, SensorSchema } from './schemas/sensor.schema';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://admin:secreto_iot@localhost:27018/iot_db?authSource=admin'),
    MongooseModule.forFeature([{ name: Sensor.name, schema: SensorSchema }]),
  ],
  exports: [
    MongooseModule,
  ],
})
export class MongoModule {}