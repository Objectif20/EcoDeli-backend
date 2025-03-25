import {  IsBase64, IsEmail,  IsOptional, IsString } from 'class-validator';

export class RegisterProviderDTO {
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
    service_type: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    postal_code: string;

    @IsString()
    city: string;

    @IsString()
    country: string;

    @IsString()
    phone: string;

    @IsString()
    newsletter: string;

    @IsString()
    language_id: string;

    @IsString()
    last_name: string;

    @IsString()
    first_name: string;

    @IsString()
    signature: string;
}
