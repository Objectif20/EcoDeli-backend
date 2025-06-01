import { BadRequestException, Body, Controller, Get,  Patch,  Post,  Req,  UploadedFile,  UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {  CalendarEvent, ProfileClient } from './type';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';




@ApiTags('Client Profile Management')
@Controller('mobile/profile')
export class ClientProfileController {
  constructor(private readonly profileService : ProfileService) {}

  @Get('me')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Get My Profile',
    operationId: 'getMyProfile',
  })
  @ApiResponse({ status: 200, description: 'Client profile retrieved successfully' })
  async getMyProfile(@Body() body: { user_id: string }): Promise<ProfileClient> {
    const { user_id } = body;
    const user = await this.profileService.getMyProfile(user_id);
    if (!user) {
      throw new Error('Client not found');
    }
    return user;
  }

  @Post('reports')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Report a Client',
    operationId: 'reportClient',
  })
  @ApiResponse({ status: 200, description: 'Client reported successfully' })
  async reportClient(@Body() body: { user_id: string, content: string }): Promise<{ message: string }> {
    const { user_id, content } = body;
    const result = await this.profileService.createReport(user_id, content);
    if (!result) {
      throw new Error('Failed to report client');
    }
    return { message: 'Client reported successfully' };
  }

  @Get('planning')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Get My Planning',
    operationId: 'getMy Planning',
  })
  @ApiResponse({ status: 200, description: 'Client planning retrieved successfully' })
  async getMyPlanning(@Body() body: { user_id: string }): Promise<CalendarEvent[]> {
    const { user_id } = body;
    const planning = await this.profileService.getPlanning(user_id);
    if (!planning) {
      throw new Error('Client planning not found');
    }
    return planning;
  }

  @Get('nfc')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Get My NFC Code',
    operationId: 'getMyNfcCode',
  })
  @ApiResponse({ status: 200, description: 'Client NFC code retrieved successfully' })
  async getMyNfcCode(@Body() body: { user_id: string }): Promise<{ nfc_code: string }> {
    const { user_id } = body;
    const nfcCode = await this.profileService.getNewNfcCode(user_id);
    if (!nfcCode) {
      throw new Error('NFC code not found');
    }
    return nfcCode;
  }


  @Post('notification')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Register Device for Notifications',
    operationId: 'registerDevice',
  })
  @ApiResponse({ status: 200, description: 'Device registered for notifications successfully' })
  async registerDevice(
    @Body() body: { user_id: string, player_id: string }
  ): Promise<{ message: string }> {
    const { user_id, player_id } = body;
    const result = await this.profileService.registerNewDevice(user_id, player_id);
    return { message: 'Device registered for notifications successfully' };
  }

    @Patch('me')
    @UseGuards(ClientJwtGuard)
    @UseInterceptors(FileInterceptor('file'))
    async updateProfile(
      @Req() req: { user: { user_id: string }; body: any },
      @UploadedFile() file: Express.Multer.File,
    ): Promise<ProfileClient> {
      const userId = req.user?.user_id;
      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      const { first_name, last_name } = req.body;

      return this.profileService.updateProfile(userId, first_name, last_name, file);
    }
}
