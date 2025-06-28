import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Point } from 'geojson';

export class CreateWarehouseDto {
  @IsString()
  city: string;

  @IsNumber()
  capacity: number;

  coordinates: Point;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  address: string;

  @IsString()
  postal_code: string;
}
