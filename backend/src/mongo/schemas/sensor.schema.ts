import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SensorDocument = Sensor & Document;

@Schema({ timestamps: true })
export class Sensor {
  @Prop({ required: true, type: String })
  deviceId!: string;

  @Prop({ required: true, type: Number })
  temperatura!: number;

  @Prop({ required: true, type: Number })
  humedad!: number;

  @Prop({ required: true, type: Number, min: 0, max: 4 })
  nivelAgua!: number; 
}

export const SensorSchema = SchemaFactory.createForClass(Sensor);