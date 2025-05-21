import { IsInt, IsBoolean, IsOptional, IsString } from 'class-validator';

export class AvailabilityDto {
  @IsInt()
  day_of_week: number;

  @IsBoolean()
  morning: boolean;

  @IsOptional()
  @IsString()
  morning_start_time?: string;

  @IsOptional()
  @IsString()
  morning_end_time?: string;  

  @IsBoolean()
  afternoon: boolean; 

  @IsOptional()
  @IsString()
  afternoon_start_time?: string;  

  @IsOptional()
  @IsString()
  afternoon_end_time?: string; 

  @IsBoolean()
  evening: boolean;  

  @IsOptional()
  @IsString()
  evening_start_time?: string;  

  @IsOptional()
  @IsString()
  evening_end_time?: string;  
}
