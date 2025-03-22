import { Body, Controller, Get, Post, Patch, Delete, Param, NotFoundException, UseGuards, BadRequestException, Request, Query } from '@nestjs/common';
import { DeliveryPersonService } from './delivery_person.service';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Vehicle } from 'src/common/entities/vehicle.entity';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { DeliveryPersonResponse } from './dto/delivery_person.dto';

@Controller('admin/deliveryPerson')
export class DeliveryPersonController {
    constructor(private readonly deliveryPersonService: DeliveryPersonService) { }


    @Post(':id')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async updateDeliveryPersonStatus(
        @Param('id') id: string,
        @Body('status') status: 'Accepted' | 'Rejected'
    ): Promise<DeliveryPerson | null> {
        if (!['Accepted', 'Rejected'].includes(status)) {
            throw new BadRequestException('Invalid status. Only "Accepted" or "Rejected" are allowed.');
        }

        return this.deliveryPersonService.updateDeliveryPersonStatus(id, status);
    }

    @Post(':deliveryPersonId/vehicle/:vehicleId')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async validateVehicleOfDeliveryPerson(
        @Param('deliveryPersonId') deliveryPersonId: string,
        @Param('vehicleId') vehicleId: string,
        @Body('validated') validated: boolean,
        @Request() req,
    ): Promise<Vehicle | null> {
        if (typeof validated !== 'boolean') {
            throw new BadRequestException('Invalid value for validated. Must be true or false.');
        }

        const adminId = req.body.admin_id;

        return this.deliveryPersonService.validateVehicleOfDeliveryPerson(deliveryPersonId, vehicleId, validated, adminId);
    }


    @Get()
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async getAllDeliveryPersons(
        @Query('status') status: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ): Promise<{ data: DeliveryPersonResponse[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
        return this.deliveryPersonService.getAllDeliveryPersons(status, page, limit);
    }


    @Get(':id')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async getDeliveryPersonById(@Param('id') id: string): Promise<DeliveryPerson> {
        return this.deliveryPersonService.getDeliveryPersonById(id);
    }

    @Patch(':id')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async updateDeliveryPerson(
        @Param('id') id: string,
        @Body() updateData: Partial<DeliveryPerson>
    ): Promise<DeliveryPerson> {
        return this.deliveryPersonService.updateDeliveryPerson(id, updateData);
    }

    @Patch(':deliveryPersonId/vehicle/:vehicleId')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @AdminRole('superadmin')
    async updateVehicleOfDeliveryPerson(
        @Param('deliveryPersonId') deliveryPersonId: string,
        @Param('vehicleId') vehicleId: string,
        @Body() updateData: Partial<Vehicle>
    ): Promise<Vehicle> {
        return this.deliveryPersonService.updateVehicleOfDeliveryPerson(deliveryPersonId, vehicleId, updateData);
    }



}