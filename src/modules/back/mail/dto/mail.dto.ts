import { IsString, IsArray, IsDateString, IsOptional } from 'class-validator';

export class ScheduleNewsletterDto {
  @IsString()
  admin_id: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsDateString()
  day: string;

  @IsString()
  hour: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profiles?: string[];
}

export class SendNewsletterDto {
  @IsString()
  admin_id: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsArray()
  @IsString({ each: true })
  profiles: string[];
}
