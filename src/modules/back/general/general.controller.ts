import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { GeneralService } from './general.service';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { Contracts, VehicleCategory } from './type';
import { CreateVehicleCategoryDto } from './dto/vehicles.dto';
import { Category } from 'src/common/entities/category.entity';

@Controller('admin/general')
export class GeneralController {
  constructor(private readonly generalService: GeneralService) {}

  @Get('contracts')
    @UseGuards(AdminJwtGuard)
    async getContract(
        @Query('type') type: string,
        @Query('page') page: number = 1,
        @Query('q') q: string = '',
    ) : Promise<{data : Contracts[], total: number}> {
        return this.generalService.getContracts(type, page, q);
    }

    @Get('vehicle-categories')
    @UseGuards(AdminJwtGuard)
    async getVehicleCategories()
    : Promise<{data : VehicleCategory[], total: number}> {
        return this.generalService.getVehicleCategories();
    }

    @Post('vehicle-categories')
    @UseGuards(AdminJwtGuard)
    async createVehicleCategory(
        @Body() createVehicleCategoryDto: CreateVehicleCategoryDto
    ): Promise<Category> {
        return this.generalService.createCategory(createVehicleCategoryDto);
    }

    @Put('vehicle-categories/:id')
    @UseGuards(AdminJwtGuard)
    async updateVehicleCategory(
        @Body() updateVehicleCategoryDto: CreateVehicleCategoryDto,
        @Query('id') id: string
    ): Promise<Category> {
        return this.generalService.updateCategory(id, updateVehicleCategoryDto);
    }


  
}
