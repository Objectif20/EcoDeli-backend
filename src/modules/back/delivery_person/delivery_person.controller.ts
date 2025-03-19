import { Body, Controller, Get, Post, Patch, Delete, Param, NotFoundException, UseGuards, BadRequestException } from '@nestjs/common';
import { DeliveryPersonService } from './delivery_person.service';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';

@Controller('admin/deliveryPerson')
export class DeliveryPersonController {
    constructor(private readonly deliveryPersonService: DeliveryPersonService) { }


    @Post(':id')
    //@UseGuards(AdminJwtGuard, AdminRoleGuard)
    //@AdminRole('superadmin')
    async updateDeliveryPersonStatus(
        @Param('id') id: string,
        @Body('status') status: 'Accepted' | 'Rejected'
    ): Promise<DeliveryPerson | null> {
        if (!['Accepted', 'Rejected'].includes(status)) {
            throw new BadRequestException('Invalid status. Only "Accepted" or "Rejected" are allowed.');
        }

        return this.deliveryPersonService.updateDeliveryPersonStatus(id, status);
    }

}
