import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVehicleCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  max_weight?: number;

  @IsOptional()
  @IsNumber()
  max_dimension?: number;
}

export class UpdateVehicleCategoryDto {
    @IsOptional()
    @IsString()
    name?: string;
  
    @IsOptional()
    @IsNumber()
    max_weight?: number;
  
    @IsOptional()
    @IsNumber()
    max_dimension?: number;
}