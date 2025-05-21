import { IsUUID, IsString } from 'class-validator';

export class CreateReportDto {
  @IsUUID()
  user_id: string;

  @IsString()
  report_message: string;
}