import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class ReportDto {
    @ApiProperty({
        description: 'The unique identifier of the report',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    report_id?: string;

    @ApiProperty({
        description: 'The status of the report',
        example: 'Pending',
    })
    @IsString({ message: 'Status must be a string' })
    @IsNotEmpty({ message: 'Status is required' })
    status: string;

    @ApiProperty({
        description: 'The assignment related to the report',
        example: 'Assignment 1',
        required: false,
    })
    @IsString({ message: 'Assignment must be a string' })
    @IsOptional()
    assignment?: string;

    @ApiProperty({
        description: 'The state of the report',
        example: 'Active',
    })
    @IsString({ message: 'State must be a string' })
    @IsNotEmpty({ message: 'State is required' })
    state: string;

    @ApiProperty({
        description: 'The unique identifier of the user',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsUUID()
    @IsNotEmpty({ message: 'User ID is required' })
    user_id: string;
}
