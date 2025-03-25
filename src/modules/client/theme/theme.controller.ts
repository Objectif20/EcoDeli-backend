import { Controller, Patch, Body } from '@nestjs/common';
import { ThemeService } from './theme.service';

@Controller('client/theme')
export class ThemeController {
    constructor(private readonly themeService: ThemeService) {}

    @Patch()
    async changeTheme(@Body() body: { user_id: string, theme_id: string }) {
        await this.themeService.changeTheme(body.user_id, body.theme_id);
        return { message: 'Thème mis à jour avec succès' };
    }
}

