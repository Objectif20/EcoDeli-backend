import { Type, Transform } from "class-transformer";
import { IsNumber, IsOptional, IsInt, Min } from "class-validator";

export class GetShipmentsDTO {
    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    radius?: number;

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

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    minPrice?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    maxPrice?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    minWeight?: number;

    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsOptional()
    @IsNumber()
    maxWeight?: number;

    @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number;

    @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number;
}
