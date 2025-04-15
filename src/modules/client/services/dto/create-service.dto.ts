import {
    IsString,
    IsOptional,
    IsBooleanString,
    IsNumberString,
    IsArray,
    ValidateIf,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  export class CreateServiceDto {
    @IsString()
    service_type: string;
  
    @IsString()
    status: string;
  
    @IsBooleanString()
    validated: string;
  
    @IsString()
    name: string;
  
    @IsString()
    description: string;
  
    @IsString()
    city: string;
  
    @IsNumberString()
    price: string;
  
    @IsNumberString()
    duration_minute: string;
  
    @IsBooleanString()
    available: string;
  
    @ValidateIf(o => typeof o.keywords === 'string' || Array.isArray(o.keywords))
    @IsString({ each: true })
    @IsArray()
    @Type(() => String)
    keywords?: string | string[];
  }