import { IsString, IsEmail, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class UpdateProfileDto {

  @IsString()
  @MaxLength(255, { message: 'Last name must be no longer than 255 characters.' })
  @IsOptional()
  last_name?: string;

  @IsString()
  @MaxLength(255, { message: 'First name must be no longer than 255 characters.' })
  @IsOptional()
  first_name?: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;
}
