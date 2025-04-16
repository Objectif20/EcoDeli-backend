import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class RegisterMerchantDTO {
    @ApiProperty({
        description: 'The email address of the merchant',
        example: 'merchant@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'The password of the merchant',
        example: 'securepassword123',
    })
    @IsString()
    password: string;

    @ApiProperty({
        description: 'The name of the merchant\'s company',
        example: 'Tech Innovators Inc.',
    })
    @IsString()
    company_name: string;

    @ApiProperty({
        description: 'The SIRET number of the merchant',
        example: '12345678901234',
    })
    @IsString()
    siret: string;

    @ApiProperty({
        description: 'The address of the merchant',
        example: '123 Innovation St.',
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: 'An optional description of the merchant',
        example: 'Leading tech solutions provider',
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: 'The optional postal code of the merchant',
        example: '75001',
        required: false,
    })
    @IsString()
    @IsOptional()
    postal_code?: string;

    @ApiProperty({
        description: 'The city where the merchant is located',
        example: 'Paris',
    })
    @IsString()
    city: string;

    @ApiProperty({
        description: 'The country where the merchant is located',
        example: 'France',
    })
    @IsString()
    country: string;

    @ApiProperty({
        description: 'The phone number of the merchant',
        example: '+33123456789',
    })
    @IsString()
    phone: string;

    @ApiProperty({
        description: 'Indicates if the merchant wants to receive the newsletter',
        example: true,
    })
    @IsBoolean()
    newsletter: boolean;

    @ApiProperty({
        description: 'The temporary Stripe key for the merchant',
        example: 'temp_key_123',
    })
    @IsString()
    @IsOptional()
    stripe_temp_key: string;

    @ApiProperty({
        description: 'The language ID of the merchant',
        example: 'en',
    })
    @IsString()
    language_id: string;

    @ApiProperty({
        description: 'The optional plan ID for the merchant',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    plan_id?: number;
}
