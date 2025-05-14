import { Body, Controller, Get, Post, Patch, UseGuards, UseInterceptors, Param, UploadedFile } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AdminProfileService } from './profile.service';
import { Admin } from 'src/common/entities/admin.entity';
import { AdminProfile } from './types';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateProfileDto } from './dto/create-profile.dto';

@ApiTags('Admin Profile Management')
@Controller('admin/profile')
export class AdminProfileController {
  constructor(private readonly profileService: AdminProfileService) {}

  @Get()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get All Admin Profiles',
    operationId: 'getAllAdminProfiles',
  })
  @ApiResponse({ status: 200, description: 'List of admin profiles retrieved successfully' })
  async getAllProfile(): Promise<Partial<AdminProfile>[]> {
    return await this.profileService.getAllProfile();
  }

  @Patch('language')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Change Admin Language',
    operationId: 'changeAdminLanguage',
  })
  @ApiBody({
    description: 'Admin ID and Language ID',
    type: Object,
    examples: {
      example1: {
        value: { admin_id: 'admin_123', language_id: 'lang_456' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Admin language updated successfully' })
  async changeLanguage(@Body() body: { admin_id: string; language_id: string }): Promise<{ message: string }> {
    const { admin_id, language_id } = body;
    await this.profileService.updateLanguage(admin_id, language_id);
    return { message: 'Admin language updated successfully' };
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get My Profile',
    operationId: 'getMyProfile',
  })
  @ApiResponse({ status: 200, description: 'Admin profile retrieved successfully' })
  async getMyProfile(@Body() body: { admin_id: string }): Promise<AdminProfile> {
    const { admin_id } = body;
    const admin = await this.profileService.getMyProfile(admin_id);
    if (!admin) {
      throw new Error('Admin not found');
    }
    return admin;
  }

  @Get(':id')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get Admin Profile by ID',
    operationId: 'getAdminProfileById',
  })
  @ApiParam({ name: 'id', description: 'The ID of the admin' })
  @ApiResponse({ status: 200, description: 'Admin profile retrieved successfully' })
  async getProfileById(@Param('id') adminId: string): Promise<Partial<Admin>> {
    const admin = await this.profileService.getProfileById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }
    return admin;
  }

  @Patch(':id')
  @UseGuards(AdminJwtGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({
    summary: 'Update Admin Profile',
    operationId: 'updateAdminProfile',
  })
  @ApiParam({ name: 'id', description: 'The ID of the admin' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Admin profile updated successfully' })
  async updateProfile(
    @Param('id') admin_id: string,
    @Body() updateProfile: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Partial<Admin>> {
    return await this.profileService.updateProfile(admin_id, updateProfile, file);
  }

  @Patch(':id/role')
  @AdminRole('SUPER_ADMIN')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Update Admin Role',
    operationId: 'updateAdminRole',
  })
  @ApiParam({ name: 'id', description: 'The ID of the admin' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'Admin role updated successfully' })
  async updateRole(@Param('id') admin_id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<{ message: string }> {
    return this.profileService.updateRole(admin_id, updateRoleDto);
  }

  @Post()
  @AdminRole('SUPER_ADMIN')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Create Admin Profile',
    operationId: 'createAdminProfile',
  })
  @ApiBody({ type: CreateProfileDto })
  @ApiResponse({ status: 201, description: 'Admin profile created successfully' })
  async createProfile(@Body() createProfileDto: CreateProfileDto) {
    const adminProfile = await this.profileService.createProfile(createProfileDto);
    return adminProfile;
  }

  @Post('newPassword')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Reset Admin Password',
    operationId: 'resetAdminPassword',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async newPassword(@Body() body: { admin_id: string }) {
    return await this.profileService.newPassword(body.admin_id);
  }
}
