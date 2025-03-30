import { IsUUID, IsOptional, IsString, IsNotEmpty, ValidateNested, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { Point } from 'geojson';

class ExchangePointData {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsNotEmpty()
  coordinates: Point;
}

export class CreateDeliveryDto {
  @IsUUID()
  @IsNotEmpty()
  shipmentId: string;

  @IsUUID()
  @IsNotEmpty()
  deliveryPersonId: string;

  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExchangePointData)
  newExchangePointData?: ExchangePointData;
}
