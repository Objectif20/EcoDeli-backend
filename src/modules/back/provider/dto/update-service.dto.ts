import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsDecimal } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  service_type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  validated?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  price_admin?: number;

  @IsOptional()
  @IsNumber()
  duration_minute?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
