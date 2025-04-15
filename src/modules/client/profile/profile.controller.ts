import { BadRequestException, Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { User } from './type';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';



@ApiTags('Client Profile Management')
@Controller('client/profile')
export class ClientProfileController {
  constructor(private readonly profileService : ProfileService) {}

  @Get('me')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Get My Profile',
    operationId: 'getMyProfile',
  })
  @ApiResponse({ status: 200, description: 'Client profile retrieved successfully' })
  async getMyProfile(@Body() body: { user_id: string }): Promise<User> {
    const { user_id } = body;
    const user = await this.profileService.getMyProfile(user_id);
    if (!user) {
      throw new Error('Client not found');
    }
    return user;
  }


  @Get('provider/documents')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Get My Documents', operationId: 'getMyDocuments' })
  @ApiResponse({ status: 200, description: 'Client documents retrieved successfully' })
  async getMyDocuments(@Body() body: { user_id: string }) {
    return this.profileService.getMyDocuments(body.user_id);
  }

  @Post('provider/documents/add')
  @UseGuards(ClientJwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Add a Document', operationId: 'addDocument' })
  @ApiResponse({ status: 200, description: 'Document added successfully' })
  async addDocument(
    @Req() req: Request,
    @Body() body: { name: string; description?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = (req as any).user?.user_id;
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.profileService.addDocument(userId, body.name, file, body.description);
  }

}
