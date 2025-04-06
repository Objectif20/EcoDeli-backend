import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsEmail, IsOptional, IsString } from 'class-validator';

export class RegisterProviderDTO {
    @ApiProperty({
        description: 'The email address of the provider',
        example: 'provider@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'The password of the provider',
        example: 'securepassword123',
    })
    @IsString()
    password: string;

    @ApiProperty({
        description: 'The name of the provider\'s company',
        example: 'Service Providers Ltd.',
    })
    @IsString()
    company_name: string;

    @ApiProperty({
        description: 'The SIRET number of the provider',
        example: '12345678901234',
    })
    @IsString()
    siret: string;

    @ApiProperty({
        description: 'The address of the provider',
        example: '456 Service Ave.',
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: 'The type of service provided',
        example: 'Consulting',
    })
    @IsString()
    service_type: string;

    @ApiProperty({
        description: 'An optional description of the provider',
        example: 'Leading service provider in the industry',
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: 'The postal code of the provider',
        example: '75002',
    })
    @IsString()
    postal_code: string;

    @ApiProperty({
        description: 'The city where the provider is located',
        example: 'Paris',
    })
    @IsString()
    city: string;

    @ApiProperty({
        description: 'The country where the provider is located',
        example: 'France',
    })
    @IsString()
    country: string;

    @ApiProperty({
        description: 'The phone number of the provider',
        example: '+33198765432',
    })
    @IsString()
    phone: string;

    @ApiProperty({
        description: 'Indicates if the provider wants to receive the newsletter',
        example: 'yes',
    })
    @IsString()
    newsletter: string;

    @ApiProperty({
        description: 'The language ID of the provider',
        example: 'en',
    })
    @IsString()
    language_id: string;

    @ApiProperty({
        description: 'The last name of the provider',
        example: 'Doe',
    })
    @IsString()
    last_name: string;

    @ApiProperty({
        description: 'The first name of the provider',
        example: 'John',
    })
    @IsString()
    first_name: string;

    @ApiProperty({
        description: 'The signature of the provider',
        example: 'John Doe, CEO',
    })
    @IsString()
    signature: string;
}
