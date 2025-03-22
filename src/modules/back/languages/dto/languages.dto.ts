import { IsBoolean, IsISO31661Alpha2, IsString, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @MaxLength(255)
  language_name: string;

  @IsISO31661Alpha2()
  iso_code: string;

  @IsBoolean()
  active: boolean;
}

export class UpdateLanguageDto {
  @IsString()
  @MaxLength(255)
  language_name?: string;

  @IsISO31661Alpha2()
  iso_code?: string;

  @IsBoolean()
  active?: boolean;
}
