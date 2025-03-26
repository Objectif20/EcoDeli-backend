import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MaxLength, IsArray, ArrayNotEmpty, IsNotEmpty } from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({
    description: 'The last name of the profile',
    example: 'Doe',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  @MaxLength(255, { message: 'Last name must not exceed 255 characters.' })
  last_name: string;

  @ApiProperty({
    description: 'The first name of the profile',
    example: 'John',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  @MaxLength(255, { message: 'First name must not exceed 255 characters.' })
  first_name: string;

  @ApiProperty({
    description: 'The email address of the profile',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @ApiProperty({
    description: 'The roles assigned to the profile',
    example: ['admin', 'user'],
    type: [String],
  })
  @IsArray({ message: 'Roles must be an array of strings.' })
  @ArrayNotEmpty({ message: 'At least one role must be specified.' })
  @IsString({ each: true, message: 'Each role must be a string.' })
  roles: string[];
}
