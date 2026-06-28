import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sensor, SensorDocument } from '../mongo/schemas/sensor.schema';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { RedisService } from '../redis/redis.service';
import { EventosGateway } from '../eventos/eventos.gateway';

@Injectable()
export class SensorService {
  private readonly logger = new Logger(SensorService.name);

  constructor(
    @InjectModel(Sensor.name) private sensorModel: Model<SensorDocument>,
    private readonly redisService: RedisService,
    private readonly eventosGateway: EventosGateway,
  ) {}

  async procesarDatos(datos: CreateSensorDto) {
    try {
      const nuevoDato = new this.sensorModel(datos);
      await nuevoDato.save();

      await this.redisService.procesarDatoEnTiempoReal(datos);
      
      this.eventosGateway.emitirDatosDelSensor(datos);

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