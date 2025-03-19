import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class ValidateProviderDto {
  @IsBoolean()
  validated: boolean;

  @IsString()
  @IsUUID()
  admin_id: string;
}
