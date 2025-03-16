import { IsNotEmpty, IsString, MinLength } from "class-validator";


export class NewPasswordDto {

    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsString({ message: 'Secret Code must be a string' })
    @IsNotEmpty({ message: 'Secret Code is required' })
    secretCode: string;
}