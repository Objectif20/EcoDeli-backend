import { Controller, Patch, Body, Param, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { LanguageService } from './langue.service';

@ApiTags('Language Management')
@Controller('client/languages')
export class LanguageController {
    constructor(private readonly languageService: LanguageService) {}

    @Patch()
    @ApiOperation({
        summary: 'Change User Language',
        operationId: 'changeUserLanguage',
    })
    @ApiBody({
        description: 'User ID and Language ID',
        type: Object,
        examples: {
            example1: {
                value: { user_id: 'user_123', language_id: 'lang_456' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Language updated successfully' })
    async changeLanguage(@Body() body: { user_id: string, language_id: string }) {
        await this.languageService.changeLanguage(body.user_id, body.language_id);
        return { message: 'Langue mise à jour avec succès' };
    }

    @Get(':iso_code')
    @ApiOperation({
        summary: 'Get Default Language',
        operationId: 'getDefaultLanguage',
    })
    @ApiResponse({ status: 200, description: 'Default language retrieved successfully' })
    async getDefaultLanguage(@Param('iso_code') iso_code: string) {
        const language = await this.languageService.getDefaultLanguage(iso_code);
        return  language ;
    }
}
