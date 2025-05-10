import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryPersonService } from './delivery_person.service';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Vehicle } from 'src/common/entities/vehicle.entity';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { DeliveryPersonResponse } from './dto/delivery_person.dto';
import { AllDeliveryPerson, DeliverymanDetails } from './type';

@ApiTags('Delivery Person Management')
@Controller('admin/deliveryPerson')
export class DeliveryPersonController {
    constructor(private readonly deliveryPersonService: DeliveryPersonService) { }

    @Post(':id')
    @AdminRole('DELIVERY')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({ summary: 'Update Delivery Person Status' })
    @ApiParam({ name: 'id', description: 'The ID of the delivery person' })
    @ApiResponse({ status: 200, description: 'Delivery person status updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid status provided' })
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
    @AdminRole('DELIVERY')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({ summary: 'Validate Vehicle of Delivery Person' })
    @ApiParam({ name: 'deliveryPersonId', description: 'The ID of the delivery person' })
    @ApiParam({ name: 'vehicleId', description: 'The ID of the vehicle' })
    @ApiResponse({ status: 200, description: 'Vehicle validated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid value for validated' })
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
    @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Get All Delivery Persons' })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiResponse({ status: 200, description: 'List of delivery persons retrieved successfully' })
    async getAllDeliveryPersons(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ): Promise<{ data: AllDeliveryPerson[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
        return this.deliveryPersonService.getAllDeliveryPersons(page, limit);
    }

    @Get(':id')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Get Delivery Person by ID' })
    @ApiParam({ name: 'id', description: 'The ID of the delivery person' })
    @ApiResponse({ status: 200, description: 'Delivery person retrieved successfully' })
    async getDeliveryPersonById(@Param('id') id: string): Promise<DeliverymanDetails> {
        return this.deliveryPersonService.getDeliveryPersonById(id);
    }

    @Patch(':id')
    @AdminRole('DELIVERY')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({ summary: 'Update Delivery Person' })
    @ApiParam({ name: 'id', description: 'The ID of the delivery person' })
    @ApiResponse({ status: 200, description: 'Delivery person updated successfully' })
    async updateDeliveryPerson(
        @Param('id') id: string,
        @Body() updateData: Partial<DeliveryPerson>
    ): Promise<DeliveryPerson> {
        return this.deliveryPersonService.updateDeliveryPerson(id, updateData);
    }

    @Patch(':deliveryPersonId/vehicle/:vehicleId')
    @AdminRole('DELIVERY')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({ summary: 'Update Vehicle of Delivery Person' })
    @ApiParam({ name: 'deliveryPersonId', description: 'The ID of the delivery person' })
    @ApiParam({ name: 'vehicleId', description: 'The ID of the vehicle' })
    @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
    async updateVehicleOfDeliveryPerson(
        @Param('deliveryPersonId') deliveryPersonId: string,
        @Param('vehicleId') vehicleId: string,
        @Body() updateData: Partial<Vehicle>
    ): Promise<Vehicle> {
        return this.deliveryPersonService.updateVehicleOfDeliveryPerson(deliveryPersonId, vehicleId, updateData);
    }
}
