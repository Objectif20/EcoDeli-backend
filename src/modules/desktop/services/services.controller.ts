import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { MyServicesResponse, ServiceDetails } from './type';

@ApiTags('Merchant Management')
@Controller('desktop/deliveries')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('services')
  @ApiOperation({ summary: 'Récupère la liste paginée des services' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Liste des services renvoyée avec succès' })
  async getAllServices(
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ): Promise<MyServicesResponse> {
    return this.servicesService.getAllServices(Number(page), Number(limit));
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Récupère les détails d’un service' })
  @ApiResponse({ status: 200, description: 'Détails du service renvoyés avec succès' })
  @ApiResponse({ status: 404, description: 'Service non trouvé' })
  async getServiceDetails(@Param('id') id: string): Promise<ServiceDetails> {
    return this.servicesService.getServiceDetails(id);
  }
}
