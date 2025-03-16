import { Body, Controller, Post, Res, UseGuards,Req, Get, Patch, UseInterceptors, Param, UploadedFile } from '@nestjs/common';
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

@Controller('admin/profile') 
export class AdminProfileController {
  constructor(private readonly profileService: AdminProfileService) {}

    @Get()
    @UseGuards(AdminJwtGuard)
    async getAllProfile() : Promise<Partial<Admin>[]> {
        return await this.profileService.getAllProfile();
    }

    @Get('me')
    @UseGuards(AdminJwtGuard)
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
    async getProfileById(@Req() req): Promise<Partial<Admin>> {
        const admin_id = req.params.id;
        const admin = await this.profileService.getProfileById(admin_id);
        if (!admin) {
            throw new Error('Admin not found');
        }
        return admin;
    }

    @Patch(':id')
    @UseGuards(AdminJwtGuard)
    @UseInterceptors(FileInterceptor('photo'))
    async updateProfile(
      @Param('id') admin_id: string,
      @Body() updateProfile: UpdateProfileDto,
      @UploadedFile() file?: Express.Multer.File,
    ) : Promise<Partial<Admin>> {
      return await this.profileService.updateProfile(admin_id, updateProfile, file);
    }

    @Patch(':id/role')
    @AdminRole('SUPER_ADMIN')
    @UseGuards(AdminJwtGuard, AdminRoleGuard) 
        async updateRole(@Param('id') admin_id: string, @Body() updateRoleDto: UpdateRoleDto)  : Promise<{ message: string }> {
        return this.profileService.updateRole(admin_id, updateRoleDto);
      }

    @Post()
    @AdminRole('SUPER_ADMIN')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    async createProfile(
    @Body() createProfileDto: CreateProfileDto, 
    ) {
    const adminProfile = await this.profileService.createProfile(createProfileDto)
    return adminProfile;
    }

    @Post('newPassword')
    @UseGuards(AdminJwtGuard)
    async newPassword(@Body() body: { admin_id: string }) {
        return await this.profileService.newPassword(body.admin_id);
    }
  
}
