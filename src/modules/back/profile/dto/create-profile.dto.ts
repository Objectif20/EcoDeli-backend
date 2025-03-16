import { IsString, IsEmail, MaxLength, IsArray, ArrayNotEmpty, IsNotEmpty } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  @MaxLength(255, { message: 'Last name must not exceed 255 characters.' })
  last_name: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  @MaxLength(255, { message: 'First name must not exceed 255 characters.' })
  first_name: string;

  @IsEmail({}, { message: 'Email must be a valid address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsArray({ message: 'Roles must be an array of strings.' })
  @ArrayNotEmpty({ message: 'At least one role must be specified.' })
  @IsString({ each: true, message: 'Each role must be a string.' })
  roles: string[];
}
