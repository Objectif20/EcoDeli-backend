import { IsBoolean, IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class ValidateServiceDto {
  @IsString()
  @IsUUID()
  admin_id: string;

  @IsNumber()
  @IsOptional()
  price_admin?: number;
}
