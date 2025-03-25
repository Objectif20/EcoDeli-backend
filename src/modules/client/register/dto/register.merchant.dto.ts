import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from "class-validator";

export class RegisterMerchantDTO {
    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    company_name: string;

    @IsString()
    siret: string;

    @IsString()
    address: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    postal_code?: string;

    @IsString()
    city: string;

    @IsString()
    country: string;

    @IsString()
    phone: string;

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
