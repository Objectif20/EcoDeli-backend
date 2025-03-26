import { Controller, Patch, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { ThemeService } from './theme.service';

@ApiTags('Theme Management')
@Controller('client/theme')
export class ThemeController {
    constructor(private readonly themeService: ThemeService) {}

    @Patch()
    @ApiOperation({
        summary: 'Change User Theme',
        operationId: 'changeUserTheme',
    })
    @ApiBody({
        description: 'User ID and Theme ID',
        type: Object,
        examples: {
            example1: {
                value: { user_id: 'user_123', theme_id: 'theme_456' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Theme updated successfully' })
    async changeTheme(@Body() body: { user_id: string, theme_id: string }) {
        await this.themeService.changeTheme(body.user_id, body.theme_id);
        return { message: 'Thème mis à jour avec succès' };
    }
}
