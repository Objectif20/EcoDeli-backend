import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class VehicleResponse {
    @IsUUID()
    @IsNotEmpty()
    vehicle_id: string;

    @IsString({ message: 'Model must be a string' })
    @IsNotEmpty({ message: 'Model is required' })
    model: string;

    @IsString({ message: 'Registration number must be a string' })
    @IsNotEmpty({ message: 'Registration number is required' })
    registration_number: string;

    @IsString({ message: 'Type must be a string' })
    @IsNotEmpty({ message: 'Type is required' })
    type: string;

    @IsString({ message: 'Number must be a string' })
    @IsNotEmpty({ message: 'Number is required' })
    number: string;

    @IsNotEmpty({ message: 'Documents are required' })
    documents: { id: string; url: string }[];
}
