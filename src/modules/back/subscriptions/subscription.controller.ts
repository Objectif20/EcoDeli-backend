import { Controller, Get, UseGuards, Param, Patch, Body, Query } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';

@Controller('admin/subscriptions')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Get()
    @UseGuards(AdminJwtGuard)
    async getSubscriptionStats() {
        return this.subscriptionService.getSubscriptionStats();
    }

    @Get('list')
    @UseGuards(AdminJwtGuard)
    async getSubscribersList(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('planId') planId?: number,
    ) {
        return this.subscriptionService.getSubscribersList(page, limit, planId);
    }


    @Get(':id')
    @UseGuards(AdminJwtGuard)
    async getSubscriptionById(@Param('id') id: number) {
        return this.subscriptionService.getSubscriptionById(id);
    }


    @Patch(':id')
    @AdminRole('FINANCE')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    async updateSubscription(
        @Param('id') id: number,
        @Body() updateSubscriptionDto: any,
    ) {
        return this.subscriptionService.updateSubscription(id, updateSubscriptionDto);
    }
}