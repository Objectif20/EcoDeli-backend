import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class LocationDTO {
    @IsString()
    longitude: string;

    @IsString()
    latitude: string;
}

class ParcelDTO {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    weight?: string;

    @IsString()
    @IsOptional()
    estimate_price?: string;

    @IsString()
    @IsOptional()
    fragility?: string;

    @IsString()
    @IsOptional()
    volume?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];
}

class ShipmentDTO {
    @IsString()
    description: string;

    @IsNumber()
    @IsOptional()
    estimated_total_price?: number;

    @IsNumber()
    @IsOptional()
    proposed_delivery_price?: number;

    @IsString()
    @IsOptional()
    weight?: string;

    @IsString()
    @IsOptional()
    volume?: string;

    @IsString()
    @IsOptional()
    deadline_date?: string;

    @IsString()
    @IsOptional()
    time_slot?: string;

    @IsString()
    @IsOptional()
    urgent: string;

    @IsString()
    @IsOptional()
    status: string;

    @IsArray()
    @IsString({ each: true })
    keywords: string[];

    @IsString()
    departure_city: string;

    @ValidateNested()
    @Type(() => LocationDTO)
    departure_location: LocationDTO;

    @IsString()
    arrival_city: string;

    @ValidateNested()
    @Type(() => LocationDTO)
    arrival_location: LocationDTO;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ParcelDTO)
    parcels: ParcelDTO[];
}

export class CreateShipmentDTO {
    @ValidateNested()
    @Type(() => ShipmentDTO)
    shipment: ShipmentDTO;

    @IsString()
    user_id: string;
}
