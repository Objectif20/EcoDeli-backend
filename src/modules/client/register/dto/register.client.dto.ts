import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from "class-validator";


export class RegisterClientDTO {

    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    last_name: string;

    @IsString()
    first_name: string;
    
    @IsBoolean()
    newsletter: boolean;

    @IsString()
    stripe_temp_key: string;

    @IsString()
    language_id: string;

    @IsOptional()
    @IsNumber()
    plan_id?: number;

}