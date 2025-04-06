import { ApiProperty } from '@nestjs/swagger';
import { IsISO31661Alpha2, IsString, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({
    description: 'The name of the language',
    example: 'French',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  language_name: string;

  @ApiProperty({
    description: 'The ISO 3166-1 alpha-2 code of the language',
    example: 'FR',
  })
  @IsISO31661Alpha2()
  iso_code: string;

  @ApiProperty({
    description: 'Indicates if the language is active',
    example: 'true',
  })
  @IsString()
  active: string;
}

export class UpdateLanguageDto {
  @ApiProperty({
    description: 'The name of the language',
    example: 'French',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  language_name?: string;

  @ApiProperty({
    description: 'The ISO 3166-1 alpha-2 code of the language',
    example: 'FR',
    required: false,
  })
  @IsISO31661Alpha2()
  iso_code?: string;

  @ApiProperty({
    description: 'Indicates if the language is active',
    example: 'true',
    required: false,
  })
  @IsString()
  active?: string;
}
