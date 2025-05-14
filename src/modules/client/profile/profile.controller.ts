import { BadRequestException, Body, Controller, Delete, Get, HttpException, HttpStatus, Ip, NotFoundException, Param, Patch, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { BillingsData, User } from './type';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateMyBasicProfileDto } from './dto/update-basic-profile.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { Availability } from 'src/common/entities/availibities.entity';
import { AvailabilityDto } from './dto/availitity.dto';
import { CommonSettingsDto } from './dto/common-settings.dto';



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
  async updateProfilePic(  @Req() req: { user: { user_id: string }; body: any }, @UploadedFile() file: Express.Multer.File) {
    const userId = (req as any).user?.user_id;
    return this.profileService.updateProfilePicture(userId, file);
  }

  @Post("report")
  @UseGuards(ClientJwtGuard)
  async create(@Body() dto: CreateReportDto) {
    return this.profileService.createReport(dto);
  }

  @Post('create-account')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Create Stripe Account', operationId: 'createStripeAccount' })
  @ApiResponse({ status: 200, description: 'Stripe account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createStripeAccount(
    @Body() body: { user_id: string }
  ) {
    try {
      const response = await this.profileService.createStripeAccount(
        body.user_id, 
      );
  
      return response;
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création du compte Stripe', error.message);
    }
  }

  @Post('update-account')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Update Stripe Account', operationId: 'updateStripeAccount' })
  @ApiResponse({ status: 200, description: 'Stripe account updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateStripeAccount(@Body() body: { user_id: string }) {
    try {
      const stripeAccountId = await this.profileService.getStripeAccountId(body.user_id);
      if (!stripeAccountId) {
        throw new BadRequestException('Stripe Account ID is null or undefined');
      }
      const accountLinkUrl = await this.profileService.updateExpressAccount(stripeAccountId);
      return { accountLinkUrl };
    } catch (error) {
      throw new BadRequestException('Erreur lors de la mise à jour du compte Stripe', error.message);
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
    return this.profileService.isStripeExpressAccountValid(userId);
  }

  @Get('billings')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Get My Billings', operationId: 'getMyBillings' })
  @ApiResponse({ status: 200, description: 'Client billings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Billings not found' })
  async getMyBillings(@Body() body: { user_id: string }) : Promise<BillingsData> {
    const userId = body.user_id;
    const billings = await this.profileService.getMyBillingsData(userId);
    return billings;
  }

  @Post('create-payment')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Take a Billing', operationId: 'takeBilling' })
  @ApiResponse({ status: 200, description: 'Billing taken successfully' })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  async createPayment(@Body() body: { user_id: string }) {
    const userId = body.user_id;
    return this.profileService.createPayment(userId, false);
  }

  @Get('provider/documents')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Get My Documents', operationId: 'getMyDocuments' })
  @ApiResponse({ status: 200, description: 'Client documents retrieved successfully' })
  async getMyDocuments(@Body() body: { user_id: string }) {
    return this.profileService.getMyDocuments(body.user_id);
  }

  @Get("my-subscription")
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Get My Subscription', operationId: 'getMySubscription' })
  @ApiResponse({ status: 200, description: 'Client subscription retrieved successfully' })
  async getMySubscription(@Body() body: { user_id: string }) {
    return this.profileService.getMySubscriptionData(body.user_id);
  }

  @Patch('subscription')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Update My Subscription', operationId: 'updateMySubscription' })
  @ApiResponse({ status: 200, description: 'Client subscription updated successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateMySubscription(@Body() body: { user_id: string; planId: number, paymentMethodId?: string }) {
    const userId = body.user_id;
    const subscriptionId = body.planId;
    const paymentMethodId = body.paymentMethodId;
    const subscription = await this.profileService.updateMySubscription(userId, subscriptionId, paymentMethodId);
    return subscription;
  }

  @Patch('bank-data')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Update Bank Data', operationId: 'updateBankData' })
  @ApiResponse({ status: 200, description: 'Bank data updated successfully' })
  @ApiResponse({ status: 404, description: 'Bank data not found' })
  async updateBankData(@Body() body: { user_id: string; bank_data: any }) {
    const userId = body.user_id;
    const bankData = body.bank_data;
    return this.profileService.updateStripeBankData(userId, bankData);
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

  @Get('availability')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Get Availability', operationId: 'getAvailability' })
  @ApiResponse({ status: 200, description: 'Availability retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Availability not found' })
  async getAvailability(@Body() body : { user_id: string },): Promise<Availability[]> {
    try {
      return await this.profileService.getAvailabilityForUser(body.user_id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Put('availability')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({ summary: 'Update Availability', operationId: 'updateAvailability' })
  @ApiResponse({ status: 200, description: 'Availability updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateAvailability(
    @Body()
    body: {
      user_id: string;
      availabilities: AvailabilityDto[];
    },
  ): Promise<Availability[]> {
    try {
      return await this.profileService.updateAvailabilityForUser(body.user_id, body.availabilities);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("myDocuments")
  @UseGuards(ClientJwtGuard)
  async getDocuments() {
    return this.profileService.getMyProfileDocuments();
  }

  @Post('newPassword')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Reset Client Password',
    operationId: 'resetClientPassword',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async newPassword(@Body() body: { user_id: string }) {
    return await this.profileService.newPassword(body.user_id);
  }

  @Post("registerDevice")
  @UseGuards(ClientJwtGuard)
  async registerDevice(@Body() body: { user_id: string; oneSignalId: string }) {
    const { user_id, oneSignalId } = body;
    return this.profileService.registerNewDevice(user_id, oneSignalId);
  }

  @Post("createNotification")
  async createNotification(@Body() body: { user_id: string; title: string; content: string }) {
    const { user_id, title, content } = body;
    return this.profileService.createNotification(user_id, title, content);
  }

  @Get("professionnal")
  @UseGuards(ClientJwtGuard)
  async getProfessionnal(@Body() body: { user_id: string }) {
    const userId = body.user_id;
    return this.profileService.getCommonData(userId);
  }

  @Patch('professionnal')
  @UseGuards(ClientJwtGuard)
  async updateProfile(
    @Body('user_id') userId: string,
    @Body() commonSettingsDto: CommonSettingsDto,
  ) {
    return this.profileService.updateCommonData(userId, commonSettingsDto);
  }

  @Patch('language')
  @UseGuards(ClientJwtGuard)
  async updateLanguage(@Body() body: { user_id: string; language_id: string }) {
    const userId = body.user_id;
    const languageId = body.language_id;
    return this.profileService.updateLanguage(userId, languageId);
  }

}
