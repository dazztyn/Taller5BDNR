import { Controller, Post, Body } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { CreateSensorDto } from './dto/create-sensor.dto';

// Dejamos el @Controller() vacío porque la ruta completa se define en el @Post
@Controller()
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Post('sensor-data')
  async recibirDatos(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorService.procesarDatos(createSensorDto);
  }
}