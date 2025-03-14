import { IsString, IsNotEmpty, IsUUID, IsOptional, IsDate, IsIn } from 'class-validator';

export class TicketDto {
    @IsUUID()
    @IsOptional()
    ticket_id?: string;

    @IsString()
    @IsNotEmpty()
    status: string;

    @IsString()
    @IsOptional()
    assignment?: string;

    @IsString()
    state?: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsDate()
    @IsOptional()
    creation_date?: Date;

    @IsDate()
    @IsOptional()
    resolution_date?: Date;

    @IsString()
    @IsIn(['Low', 'Medium', 'High', 'Critical'])
    @IsNotEmpty()
    priority: string;

    @IsUUID()
    @IsOptional()
    admin_id_attribute?: string;

    @IsUUID()
    @IsOptional()
    admin_id_get?: string;
}
