 
  import { IsEmail, IsOptional, IsBoolean, IsString } from 'class-validator';
  
  export class UpdateMyBasicProfileDto {
    @IsOptional()
    @IsEmail()
    email?: string;
  
    @IsOptional()
    @IsString()
    first_name?: string;
  
    @IsOptional()
    @IsString()
    last_name?: string;
  
    @IsOptional()
    @IsBoolean()
    newsletter?: boolean;
  }
  