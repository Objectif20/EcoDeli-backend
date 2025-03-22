import { Controller, Get, Query, UseGuards, Param, Body, Patch } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';

@Controller('admin/merchants')
export class MerchantController {
    constructor(private readonly merchantService: MerchantService) { }

    @Get()
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async getAllMerchants(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.merchantService.getAllMerchants(page, limit);
    }

    @Get(':id')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async getMerchantById(@Param('id') id: string) {
        return this.merchantService.getMerchantById(id);
    }

    @Patch(':id')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async updateMerchant(@Param('id') id: string, @Body() updateMerchantDto: any) {
        return this.merchantService.updateMerchant(id, updateMerchantDto);
    }

}