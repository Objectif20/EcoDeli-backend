import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsDateString, IsOptional } from 'class-validator';

export class ScheduleNewsletterDto {
  @ApiProperty({
    description: 'The ID of the admin scheduling the newsletter',
    example: 'admin_123',
  })
  @IsString()
  admin_id: string;

  @ApiProperty({
    description: 'The subject of the newsletter',
    example: 'Weekly Updates',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'The HTML content of the newsletter',
    example: '<h1>Welcome to our newsletter!</h1>',
  })
  @IsString()
  htmlContent: string;

  @ApiProperty({
    description: 'The scheduled day for the newsletter in ISO date format',
    example: '2023-12-25',
  })
  @IsDateString()
  day: string;

  @ApiProperty({
    description: 'The scheduled hour for the newsletter in HH:mm format',
    example: '14:30',
  })
  @IsString()
  hour: string;

  @ApiProperty({
    description: 'Optional list of profiles to send the newsletter to',
    example: ['profile_1', 'profile_2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profiles?: string[];
}

export class SendNewsletterDto {
  @ApiProperty({
    description: 'The ID of the admin sending the newsletter',
    example: 'admin_123',
  })
  @IsString()
  admin_id: string;

  @ApiProperty({
    description: 'The subject of the newsletter',
    example: 'Weekly Updates',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'The HTML content of the newsletter',
    example: '<h1>Welcome to our newsletter!</h1>',
  })
  @IsString()
  htmlContent: string;

  @ApiProperty({
    description: 'List of profiles to send the newsletter to',
    example: ['profile_1', 'profile_2'],
  })
  @IsArray()
  @IsString({ each: true })
  profiles: string[];
}
