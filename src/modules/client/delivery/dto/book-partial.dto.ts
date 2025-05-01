import { IsNotEmpty, IsOptional, IsUUID, IsNumber, IsString, IsLatitude, IsLongitude, IsDateString } from 'class-validator';

export class BookPartialDTO {
  @IsUUID()
  @IsNotEmpty()
  delivery_person_id: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  new_price: number;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}