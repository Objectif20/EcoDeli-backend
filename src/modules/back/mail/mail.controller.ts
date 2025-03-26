import { Controller, Post, Body, Query, UploadedFile, UseGuards, UseInterceptors, Get } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AdminMailService } from './mail.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { ScheduleNewsletterDto, SendNewsletterDto } from './dto/mail.dto';

@ApiTags('Mail Management')
@Controller('admin/mails')
export class MailController {
  constructor(private readonly mailService: AdminMailService) {}

  @Post('upload')
  @AdminRole('MAIL')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({
    summary: 'Upload a File',
    operationId: 'uploadFileMail',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ url: string } | { error: string }> {
    return await this.mailService.uploadPicture(file);
  }

  @Post('schedule')
  @AdminRole('MAIL')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Schedule a Newsletter',
    operationId: 'scheduleNewsletter',
  })
  @ApiBody({ type: ScheduleNewsletterDto })
  @ApiResponse({ status: 201, description: 'Newsletter scheduled successfully' })
  async scheduleNewsletter(@Body() scheduleNewsletterDto: ScheduleNewsletterDto) {
    return this.mailService.scheduleNewsletter(
      scheduleNewsletterDto.admin_id,
      scheduleNewsletterDto.subject,
      scheduleNewsletterDto.htmlContent,
      scheduleNewsletterDto.day,
      scheduleNewsletterDto.hour,
      scheduleNewsletterDto.profiles
    );
  }

  @Post('profiles')
  @AdminRole('MAIL')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Send Newsletter to Specific Profiles',
    operationId: 'sendNewsletterToProfiles',
  })
  @ApiBody({ type: SendNewsletterDto })
  @ApiResponse({ status: 200, description: 'Newsletter sent to profiles successfully' })
  async sendNewsletterToProfiles(@Body() sendNewsletterDto: SendNewsletterDto) {
    return this.mailService.sendNewsletterToProfiles(
      sendNewsletterDto.admin_id,
      sendNewsletterDto.subject,
      sendNewsletterDto.htmlContent,
      sendNewsletterDto.profiles
    );
  }

  @Post()
  @AdminRole('MAIL')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Send Newsletter to Everyone',
    operationId: 'sendNewsletterToEveryone',
  })
  @ApiBody({
    description: 'Newsletter data',
    type: SendNewsletterDto,
  })
  @ApiResponse({ status: 200, description: 'Newsletter sent to everyone successfully' })
  async sendNewsletterToEveryone(@Body() body: { admin_id: string, subject: string, htmlContent: string }) {
    return this.mailService.sendNewsletterToEveryone(
      body.admin_id,
      body.subject,
      body.htmlContent
    );
  }

  @Get()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get All Mails',
    operationId: 'getAllMails',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'List of mails retrieved successfully' })
  async getAllMails(@Query('page') page: number, @Query('limit') limit: number) {
    return this.mailService.getAllMails(page, limit);
  }
}
