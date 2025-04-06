import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TutorialService } from './tuto.service';

@ApiTags('Tutorial Management')
@Controller('client/theme/firstLogin')
export class TutorialController {
    constructor(private readonly tutorialService: TutorialService) {}

    @Get()
    @ApiOperation({
        summary: 'Check if User is Logging in for the First Time',
        operationId: 'checkFirstLogin',
    })
    @ApiQuery({ name: 'user_id', description: 'The ID of the user', required: true })
    @ApiResponse({ status: 200, description: 'Returns whether it is the user\'s first login' })
    async checkFirstLogin(@Query('user_id') user_id: string) {
        const isFirstLogin = await this.tutorialService.isFirstLogin(user_id);
        return { firstLogin: isFirstLogin };
    }
}
