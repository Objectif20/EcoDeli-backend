import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles: string[];
}
