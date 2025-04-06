import { Type, Transform } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class GetShipmentsDTO {
    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    latitude: number;

    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    longitude: number;

    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    radius: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    routeStartLatitude?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    routeStartLongitude?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    routeEndLatitude?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    routeEndLongitude?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    routeRadius?: number;
}
