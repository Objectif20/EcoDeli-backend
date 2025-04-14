import { Controller, Get,  Post, Body, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TutorialService } from './tuto.service';
import { IsNotEmpty, IsString } from 'class-validator';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';

export class UserIdDto {
    @IsString()
    @IsNotEmpty()
    user_id: string;
}

@ApiTags('Tutorial Management')
@Controller('client/theme/firstLogin')
export class TutorialController {
    constructor(private readonly tutorialService: TutorialService) {}

    @Get('check')
    @ApiOperation({
        summary: 'Check if User is Logging in for the First Time',
        operationId: 'checkFirstLogin',
    })
    @ApiBody({ type: UserIdDto })
    @ApiResponse({ status: 200, description: 'Returns whether it is the user\'s first login' })
    @UseGuards(ClientJwtGuard)
    async checkFirstLogin(@Body() body: UserIdDto) {
        const isFirstLogin = await this.tutorialService.isFirstLogin(body.user_id);
        return { firstLogin: isFirstLogin };
    }

    @Post()
    @ApiOperation({
        summary: 'Add First Login',
        operationId: 'addFirstLogin',
    })
    @ApiBody({ type: UserIdDto })
    @ApiResponse({ status: 200, description: 'First login added successfully' })
    @UseGuards(ClientJwtGuard)
    async addFirstLogin(@Body() body: UserIdDto) {
        await this.tutorialService.addFirstLogin(body.user_id);
        return { message: 'First login added successfully' };
    }
}
