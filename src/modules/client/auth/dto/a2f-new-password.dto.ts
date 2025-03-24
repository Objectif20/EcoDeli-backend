import { IsNotEmpty, IsString, MinLength,  } from "class-validator";


export class A2FNewPasswordDto {

    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsString({ message: 'Secret Code must be a string' })
    @IsNotEmpty({ message: 'secret Code is required' })
    secretCode: string;

    @IsString({ message: 'OTP code must be a string' })
    @IsNotEmpty({ message: 'OTP code is required' })
    code: string;
}