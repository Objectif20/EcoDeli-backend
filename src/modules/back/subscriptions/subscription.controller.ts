import { Controller, Get, UseGuards, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';

@ApiTags('Subscription Management')
@Controller('admin/subscriptions')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Get()
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get Subscription Statistics',
        operationId: 'getSubscriptionStats',
    })
    @ApiResponse({ status: 200, description: 'Subscription statistics retrieved successfully' })
    async getSubscriptionStats() {
        return this.subscriptionService.getSubscriptionStats();
    }

    @Get('list')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get Subscribers List',
        operationId: 'getSubscribersList',
    })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'planId', required: false, description: 'Filter by plan ID' })
    @ApiResponse({ status: 200, description: 'List of subscribers retrieved successfully' })
    async getSubscribersList(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('planId') planId?: number,
    ) {
        return this.subscriptionService.getSubscribersList(page, limit, planId);
    }

    @Get(':id')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get Subscription by ID',
        operationId: 'getSubscriptionById',
    })
    @ApiParam({ name: 'id', description: 'The ID of the subscription' })
    @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
    async getSubscriptionById(@Param('id') id: number) {
        return this.subscriptionService.getSubscriptionById(id);
    }

    @Patch(':id')
    @AdminRole('FINANCE')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({
        summary: 'Update Subscription',
        operationId: 'updateSubscription',
    })
    @ApiParam({ name: 'id', description: 'The ID of the subscription' })
    @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
    async updateSubscription(
        @Param('id') id: number,
        @Body() updateSubscriptionDto: any,
    ) {
        return this.subscriptionService.updateSubscription(id, updateSubscriptionDto);
    }
}
