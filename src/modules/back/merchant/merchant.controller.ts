import { Controller, Get, Query, UseGuards, Param, Body, Patch } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { MerchantService } from './merchant.service';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { MerchantDetails } from './type';

@ApiTags('Merchant Management')
@Controller('admin/merchants')
export class MerchantController {
    constructor(private readonly merchantService: MerchantService) { }

    @Get()
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get All Merchants',
        operationId: 'getAllMerchants',
    })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiResponse({ status: 200, description: 'List of merchants retrieved successfully' })
    async getAllMerchants(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.merchantService.getAllMerchants(page, limit);
    }

    @Get(':id')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get Merchant by ID',
        operationId: 'getMerchantById',
    })
    @ApiParam({ name: 'id', description: 'The ID of the merchant' })
    @ApiResponse({ status: 200, description: 'Merchant retrieved successfully' })
    async getMerchantById(@Param('id') id: string) : Promise<MerchantDetails> {
        return this.merchantService.getMerchantById(id);
    }

    @Patch(':id')
    @AdminRole('MERCHANT')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({
        summary: 'Update Merchant',
        operationId: 'updateMerchant',
    })
    @ApiParam({ name: 'id', description: 'The ID of the merchant' })
    @ApiBody({ description: 'Updated merchant data' })
    @ApiResponse({ status: 200, description: 'Merchant updated successfully' })
    async updateMerchant(@Param('id') id: string, @Body() updateMerchantDto: any) {
        return this.merchantService.updateMerchant(id, updateMerchantDto);
    }
}
