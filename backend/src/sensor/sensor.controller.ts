import { Controller, Post, Body, Delete } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { CreateSensorDto } from './dto/create-sensor.dto';

@Controller()
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  @Post('sensor-data')
  async recibirDatos(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorService.procesarDatos(createSensorDto);
  }

  @Delete('sensor-data/all')
  async reiniciarSistema() {
    return this.sensorService.borrarTodo();
  }
}