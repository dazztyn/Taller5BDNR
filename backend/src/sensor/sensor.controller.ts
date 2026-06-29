import { Controller, Post, Body, Delete, Get } from '@nestjs/common';
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

  @Get('sensor-data/latest')
  async obtenerUltimo() {
    return this.sensorService.obtenerEstadoActual();
  }

  @Get('sensor-data/history')
  async obtenerHistorial() {
    return this.sensorService.obtenerHistorial();
  }

  @Get('sensor-data/stats')
  async obtenerEstadisticas() {
    return this.sensorService.obtenerEstadisticas();
  }

  @Get('sensor-data/global')
  async obtenerGlobal() {
    return this.sensorService.obtenerTodoElHistorial();
  }
}