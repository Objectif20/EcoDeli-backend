import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsDate } from 'class-validator';

export class TicketDto {
    @ApiProperty({
        description: 'The unique identifier of the ticket',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    ticket_id?: string;

    @ApiProperty({
        description: 'The status of the ticket',
        example: 'Open',
    })
    @IsString({ message: 'Status must be a string' })
    @IsNotEmpty({ message: 'Status is required' })
    status: string;

    @ApiProperty({
        description: 'The assignment related to the ticket',
        example: 'Assignment 1',
        required: false,
    })
    @IsString({ message: 'Assignement must be a string' })
    @IsOptional()
    assignment?: string;

    @ApiProperty({
        description: 'The state of the ticket',
        example: 'Active',
        required: false,
    })
    @IsString({ message: 'State must be a string' })
    state?: string;

    @ApiProperty({
        description: 'The description of the ticket in JSON format',
        example: '{"issue": "Network down"}',
    })
    @IsString({ message: 'Description must be a JSON' })
    @IsNotEmpty({ message: 'Description is required' })
    description: string;

    @ApiProperty({
        description: 'The title of the ticket',
        example: 'Network Issue',
    })
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    title: string;

    @ApiProperty({
        description: 'The creation date of the ticket',
        example: '2023-10-01T00:00:00Z',
        required: false,
    })
    @IsDate({ message: 'Creation date must be a date' })
    @IsOptional()
    creation_date?: Date;

    @ApiProperty({
        description: 'The resolution date of the ticket',
        example: '2023-10-02T00:00:00Z',
        required: false,
    })
    @IsDate()
    @IsOptional()
    resolution_date?: Date;

    @ApiProperty({
        description: 'The priority of the ticket',
        example: 'High',
    })
    @IsString({ message: 'Priority must be a string' })
    @IsNotEmpty({ message: 'Priority is required' })
    priority: string;

    @ApiProperty({
        description: 'The ID of the admin who assigned the ticket',
        example: '123e4567-e89b-12d3-a456-426614174001',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    admin_id_attribute?: string;

    @ApiProperty({
        description: 'The ID of the admin who received the ticket',
        example: '123e4567-e89b-12d3-a456-426614174002',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    admin_id_get?: string;
}
