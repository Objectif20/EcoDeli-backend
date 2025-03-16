import { IsString, IsNotEmpty, IsUUID, IsOptional, IsDate } from 'class-validator';

export class TicketDto {
    @IsUUID()
    @IsOptional()
    ticket_id?: string;

    @IsString({ message: 'Status must be a string' })
    @IsNotEmpty({ message: 'Status is required' })
    status: string;

    @IsString({ message: 'Assignement must be a string' })
    @IsOptional()
    assignment?: string;

    @IsString({ message: 'State must be a string' })
    state?: string;

    @IsString({ message: 'Description must be a JSON' })
    @IsNotEmpty({ message: 'Description is required' })
    description: string;

    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    title: string;

    @IsDate({ message: 'Creation date must be a date' })
    @IsOptional({ message: 'Creation date is required' })
    creation_date?: Date;

    @IsDate()
    @IsOptional()
    resolution_date?: Date;

    @IsString({ message: 'Priority must be a string' })
    @IsNotEmpty({ message: 'Priority is required' })
    priority: string;

    @IsUUID()
    @IsOptional()
    admin_id_attribute?: string;

    @IsUUID()
    @IsOptional()
    admin_id_get?: string;
}
