import { IsString, IsUUID, IsOptional, IsDate } from 'class-validator';

export class UpdateTicketDto {
    @IsString({ message: 'Status must be a string' })
    @IsOptional()
    status?: string;

    @IsString({ message: 'Assignement must be a string' })
    @IsOptional()
    assignment?: string;

    @IsString({ message: 'State must be a string' })
    @IsOptional()
    state?: string;

    @IsString({ message: 'Description must be a JSON' })
    @IsOptional()
    description?: string;

    @IsString({ message: 'Title must be a string' })
    @IsOptional()
    title?: string;

    @IsDate({ message: 'Creation date must be a date' })
    @IsOptional()
    creation_date?: Date;

    @IsDate()
    @IsOptional()
    resolution_date?: Date;

    @IsString({ message: 'Priority must be a string' })
    @IsOptional()
    priority?: string;

    @IsUUID()
    @IsOptional()
    admin_id_attribute?: string;

    @IsUUID()
    @IsOptional()
    admin_id_get?: string;
}
