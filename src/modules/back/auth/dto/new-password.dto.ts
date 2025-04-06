import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class NewPasswordDto {
  @ApiProperty({
    description: 'The new password for the user',
    example: 'newpassword123',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    description: 'The secret code for setting the new password',
    example: 'secret123',
  })
  @IsString({ message: 'Secret Code must be a string' })
  @IsNotEmpty({ message: 'Secret Code is required' })
  secretCode: string;
}
