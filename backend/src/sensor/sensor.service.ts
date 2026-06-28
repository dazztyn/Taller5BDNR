import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sensor, SensorDocument } from '../mongo/schemas/sensor.schema';
import { CreateSensorDto } from './dto/create-sensor.dto';

@Injectable()
export class SensorService {
  private readonly logger = new Logger(SensorService.name);

  constructor(
    @InjectModel(Sensor.name) private sensorModel: Model<SensorDocument>,
  ) {}

  async procesarDatos(datos: CreateSensorDto) {
    try {
      const nuevoDato = new this.sensorModel(datos);
      await nuevoDato.save();
      
      this.logger.log(`Dato guardado en MongoDB - Device: ${datos.deviceId} | Temp: ${datos.temperatura}°C`);

      // 2. (Pendiente) Actualizar caché en Redis
      // 3. (Pendiente) Emitir WebSocket al Frontend

      return { 
        statusCode: 201, 
        message: 'Datos recibidos y almacenados correctamente' 
      };
    } catch (error) {
      this.logger.error('Error al guardar en MongoDB', error);
      throw error;
    }
  }
}