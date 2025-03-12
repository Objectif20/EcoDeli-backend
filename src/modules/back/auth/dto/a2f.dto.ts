import { IsString, IsNotEmpty } from 'class-validator';

export class A2FDto {
  @IsString({ message: 'Admin ID must be a string' })
  @IsNotEmpty({ message: 'Admin ID is required' })
  adminId: string;

  @IsString({ message: 'OTP code must be a string' })
  @IsNotEmpty({ message: 'OTP code is required' })
  code: string;
}
