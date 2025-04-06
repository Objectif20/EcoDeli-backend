import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class A2FDto {
  @ApiProperty({
    description: 'The OTP code for two-factor authentication',
    example: '123456',
  })
  @IsString({ message: 'OTP code must be a string' })
  @IsNotEmpty({ message: 'OTP code is required' })
  code: string;
}
