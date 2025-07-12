import { IsString, IsNumber, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  city: string;

  @IsString()
  capacity: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @IsOptional()
  coordinates?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  address: string;

  @IsString()
  postal_code: string;
}
