import { BadRequestException, Body, Controller, Delete, Get, Ip, NotFoundException, Param, Patch, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { User } from './type';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateMyBasicProfileDto } from './dto/update-basic-profile.dto';
import { CreateReportDto } from './dto/create-report.dto';



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

  @Get('general-settings')
  @UseGuards(ClientJwtGuard)
  async getMyBasicProfile(@Body () body: { user_id: string }) {
    const userId = body.user_id;
    return this.profileService.getMyBasicProfile(userId);
  }

  @Patch('general-settings')
  @UseGuards(ClientJwtGuard)
  async updateMyBasicProfile(@Body() dto: UpdateMyBasicProfileDto, @Body() body: { user_id: string }) {
    const userId = body.user_id;
    return this.profileService.updateMyBasicProfile(userId, dto);
  }

  @Get("blockedList")
  @UseGuards(ClientJwtGuard)
  async getProfileBlocked(@Body () body: { user_id: string }) {
    const userId = body.user_id;
    return this.profileService.getProfileWithBlocked(userId);
  }

  @Delete('blocked/:blocked_user_id')
  @UseGuards(ClientJwtGuard)
  async unblockUser(@Body () body: { user_id: string }, @Param('blocked_user_id') blocked_user_id: string) {
    const userId = body.user_id;
    return this.profileService.deleteBlocked(userId, blocked_user_id);
  }

  @Put('picture')
  @UseGuards(ClientJwtGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateProfilePic(@Body () body: { user_id: string }, @UploadedFile() file: Express.Multer.File) {
    const userId = body.user_id;
    return this.profileService.updateProfilePicture(userId, file);
  }

  @Post("report")
  @UseGuards(ClientJwtGuard)
  async create(@Body() dto: CreateReportDto) {
    return this.profileService.createReport(dto);
  }

  @Get('stripe-account')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Get Stripe Account', operationId: 'getStripeAccount' })
  @ApiResponse({ status: 200, description: 'Stripe account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stripe account not found' })
  async getStripeAccount(@Body() body : {user_id : string}): Promise<{ stripeAccountId: string }> {
    const userId = body.user_id;

    const stripeAccountId = await this.profileService.getStripeAccountId(userId);

    if (!stripeAccountId) {
      console.log('Aucun compte Stripe trouvé pour cet utilisateur.');
      throw new NotFoundException('Aucun compte Stripe trouvé pour cet utilisateur.');
    }

    return { stripeAccountId };
  }

  @Post('create-account')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Create Stripe Account', operationId: 'createStripeAccount' })
  @ApiResponse({ status: 200, description: 'Stripe account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createStripeAccount(
    @Body() body: { user_id: string; accountToken: string }
  ) {
    try {
      const stripeAccountId = await this.profileService.getOrCreateStripeAccountId(
        body.user_id, 
        body.accountToken
      );
  
      return { stripeAccountId };
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création du compte Stripe', error.message);
    }
  }

  @Get('stripe-validity')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Check Stripe Account Validity', operationId: 'checkStripeAccountValidity' })
  @ApiResponse({
    status: 200,
    description: 'Stripe account validity checked successfully',
    schema: {
      example: {
        valid: true,
        enabled: false,
        needs_id_card: true,
        url_complete: 'https://connect.stripe.com/...',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Stripe account not found' })
  async checkStripeAccountValidity(
    @Body() body: { user_id: string }
  ): Promise<{
    valid: boolean;
    enabled: boolean;
    needs_id_card: boolean;
    url_complete?: string;
  }> {
    const userId = body.user_id;
    return this.profileService.isStripeAccountValid(userId);
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
