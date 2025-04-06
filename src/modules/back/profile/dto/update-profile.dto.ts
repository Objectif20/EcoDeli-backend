import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'The last name of the profile',
    example: 'Doe',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @MaxLength(255, { message: 'Last name must be no longer than 255 characters.' })
  @IsOptional()
  last_name?: string;

  @ApiProperty({
    description: 'The first name of the profile',
    example: 'John',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @MaxLength(255, { message: 'First name must be no longer than 255 characters.' })
  @IsOptional()
  first_name?: string;

  @ApiProperty({
    description: 'The email address of the profile',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;
}
