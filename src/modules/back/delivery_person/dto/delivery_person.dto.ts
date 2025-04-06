import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsBoolean, IsNumber } from 'class-validator';
import { VehicleResponse } from './vehicle.dto';

export class DeliveryPersonResponse {
    @ApiProperty({ description: 'The unique identifier of the delivery person', example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ description: 'The email address of the delivery person', example: 'delivery@example.com' })
    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({ description: 'The status of the delivery person', example: 'active' })
    @IsString({ message: 'Status must be a string' })
    @IsNotEmpty({ message: 'Status is required' })
    status: string;

    @ApiProperty({ description: 'The phone number of the delivery person', example: '+1234567890' })
    @IsString({ message: 'Phone number must be a string' })
    @IsNotEmpty({ message: 'Phone number is required' })
    phone_number: string;

    @ApiProperty({ description: 'The type of vehicle used by the delivery person', example: 'car' })
    @IsString({ message: 'Vehicle type must be a string' })
    @IsNotEmpty({ message: 'Vehicle type is required' })
    vehicle_type: string;

    @ApiProperty({ description: 'Indicates if the delivery person is validated', example: true })
    @IsBoolean({ message: 'Validated must be a boolean' })
    validated: boolean;

    @ApiProperty({ description: 'The city where the delivery person operates', example: 'Paris' })
    @IsString({ message: 'City must be a string' })
    @IsNotEmpty({ message: 'City is required' })
    city: string;

    @ApiProperty({ description: 'The country where the delivery person operates', example: 'France' })
    @IsString({ message: 'Country must be a string' })
    @IsNotEmpty({ message: 'Country is required' })
    country: string;

    @ApiProperty({ description: 'The balance of the delivery person', example: 100.0 })
    @IsNumber({}, { message: 'Balance must be a number' })
    balance: number;

    @ApiProperty({ description: 'The list of vehicles associated with the delivery person', type: [VehicleResponse] })
    @IsNotEmpty({ message: 'Vehicles are required' })
    vehicles: VehicleResponse[];

    @ApiProperty({ description: 'The list of documents associated with the delivery person', type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' } } } })
    @IsNotEmpty({ message: 'Documents are required' })
    documents: { id: string; url: string }[];
}
