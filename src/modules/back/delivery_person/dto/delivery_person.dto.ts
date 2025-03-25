import { IsString, IsNotEmpty, IsUUID, IsBoolean, IsNumber } from 'class-validator';
import { VehicleResponse } from './vehicle.dto';

export class DeliveryPersonResponse {
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsString({ message: 'Status must be a string' })
    @IsNotEmpty({ message: 'Status is required' })
    status: string;

    @IsString({ message: 'Phone number must be a string' })
    @IsNotEmpty({ message: 'Phone number is required' })
    phone_number: string;

    @IsString({ message: 'Vehicle type must be a string' })
    @IsNotEmpty({ message: 'Vehicle type is required' })
    vehicle_type: string;

    @IsBoolean({ message: 'Validated must be a boolean' })
    validated: boolean;

    @IsString({ message: 'City must be a string' })
    @IsNotEmpty({ message: 'City is required' })
    city: string;

    @IsString({ message: 'Country must be a string' })
    @IsNotEmpty({ message: 'Country is required' })
    country: string;

    @IsNumber({}, { message: 'Balance must be a number' })
    balance: number;

    @IsNotEmpty({ message: 'Vehicles are required' })
    vehicles: VehicleResponse[];

    @IsNotEmpty({ message: 'Documents are required' })
    documents: { id: string; url: string }[];
}
