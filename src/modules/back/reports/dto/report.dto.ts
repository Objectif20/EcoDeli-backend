import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class ReportDto {
    @IsUUID()
    @IsOptional()
    report_id?: string;

    @IsString({ message: 'Status must be a string' })
    @IsNotEmpty({ message: 'Status is required' })
    status: string;

    @IsString({ message: 'Assignment must be a string' })
    @IsOptional()
    assignment?: string;

    @IsString({ message: 'State must be a string' })
    @IsNotEmpty({ message: 'State is required' })
    state: string;

    @IsUUID()
    @IsNotEmpty({ message: 'User ID is required' })
    user_id: string;
}
