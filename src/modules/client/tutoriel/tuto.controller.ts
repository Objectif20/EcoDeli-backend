import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { TutorialService } from './tuto.service';

@Controller('client/theme/firstLogin')
export class TutorialController {
    constructor(private readonly tutorialService: TutorialService) {}

    @Get()
    async checkFirstLogin(@Query('user_id') user_id: string) {
        const isFirstLogin = await this.tutorialService.isFirstLogin(user_id);
        return { firstLogin: isFirstLogin };
    }
}
