import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CreateSensorDto } from '../sensor/dto/create-sensor.dto';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async procesarDatoEnTiempoReal(dato: CreateSensorDto) {
    const { deviceId, temperatura, nivelAgua } = dato;
    const redisKey = `sensor:${deviceId}:latest`;

    try {
      await this.redisClient.set(redisKey, JSON.stringify(dato));
      
      if (temperatura > 30) {
        this.logger.warn(`¡ALERTA ROJA! Temperatura crítica en ${deviceId}: ${temperatura}°C`);
      }

      if (nivelAgua <= 1) {
        this.logger.warn(`¡ALERTA AMARILLA! Nivel de agua bajo en ${deviceId} (Nivel: ${nivelAgua})`);
      }

      this.logger.debug(`Caché actualizada en Redis para ${deviceId}`);
      return true;

    } catch (error) {
      this.logger.error('Error comunicándose con Redis', error);
      // No lanzamos el error (throw) para que una caída de Redis no bote la petición principal
      return false; 
    }
  }
}