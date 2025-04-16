import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class RegisterClientDTO {
    @ApiProperty({
        description: 'The email address of the client',
        example: 'client@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'The password of the client',
        example: 'securepassword123',
    })
    @IsString()
    password: string;

    @ApiProperty({
        description: 'The last name of the client',
        example: 'Doe',
    })
    @IsString()
    last_name: string;

    @ApiProperty({
        description: 'The first name of the client',
        example: 'John',
    })
    @IsString()
    first_name: string;

    @ApiProperty({
        description: 'Indicates if the client wants to receive the newsletter',
        example: true,
    })
    @IsBoolean()
    newsletter: boolean;

    @ApiProperty({
        description: 'The temporary Stripe key for the client',
        example: 'temp_key_123',
    })
    @IsString()
    @IsOptional()
    stripe_temp_key: string;

    @ApiProperty({
        description: 'The language ID of the client',
        example: 'en',
    })
    @IsString()
    language_id: string;

    @ApiProperty({
        description: 'The optional plan ID for the client',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    plan_id?: number;
}
