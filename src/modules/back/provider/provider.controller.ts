import { Controller, Get, Query, Param } from '@nestjs/common';
import { ProvidersService } from './provider.service';
import { stat } from 'fs';

@Controller('admin/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  getAllProviders(
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.providersService.getAllProviders(status, page, limit);
  }

  @Get(':id')
  getProviderDetails(@Param('id') id: string) {
    return this.providersService.getProviderDetails(id);
  }
}
