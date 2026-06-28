import { IsString, IsNumber, IsInt, Min, Max } from 'class-validator';

export class CreateSensorDto {
  @IsString()
  deviceId!: string;

  @IsNumber()
  temperatura!: number;

  @IsNumber()
  humedad!: number;

  @IsInt()
  @Min(0)
  @Max(4)
  nivelAgua!: number;
}