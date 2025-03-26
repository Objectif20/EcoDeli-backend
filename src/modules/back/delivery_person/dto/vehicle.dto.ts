import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class VehicleResponse {
    @ApiProperty({ description: 'The unique identifier of the vehicle', example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsUUID()
    @IsNotEmpty()
    vehicle_id: string;

    @ApiProperty({ description: 'The model of the vehicle', example: 'Toyota Corolla' })
    @IsString({ message: 'Model must be a string' })
    @IsNotEmpty({ message: 'Model is required' })
    model: string;

    @ApiProperty({ description: 'The registration number of the vehicle', example: 'ABC123' })
    @IsString({ message: 'Registration number must be a string' })
    @IsNotEmpty({ message: 'Registration number is required' })
    registration_number: string;

    @ApiProperty({ description: 'The type of the vehicle', example: 'Sedan' })
    @IsString({ message: 'Type must be a string' })
    @IsNotEmpty({ message: 'Type is required' })
    type: string;

    @ApiProperty({ description: 'The number associated with the vehicle', example: 'V12345' })
    @IsString({ message: 'Number must be a string' })
    @IsNotEmpty({ message: 'Number is required' })
    number: string;

    @ApiProperty({ description: 'The list of documents associated with the vehicle', type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' } } } })
    @IsNotEmpty({ message: 'Documents are required' })
    documents: { id: string; url: string }[];
}
