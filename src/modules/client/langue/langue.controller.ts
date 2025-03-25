import { Controller, Patch, Body } from '@nestjs/common';
import { LanguageService } from './langue.service';

@Controller('client/languages')
export class LanguageController {
    constructor(private readonly languageService: LanguageService) {}

    @Patch()
    async changeLanguage(@Body() body: { user_id: string, language_id: string }) {
        await this.languageService.changeLanguage(body.user_id, body.language_id);
        return { message: 'Langue mise à jour avec succès' };
    }
}
