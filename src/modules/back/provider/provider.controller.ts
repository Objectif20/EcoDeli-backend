import { Controller, Get, Query, Param, Body, Post, UseGuards, Patch } from '@nestjs/common';
import { ProvidersService } from './provider.service';
import { Provider, ProviderDetails } from './types';
import { ValidateProviderDto } from './dto/validate-provider.dto';
import { ValidateServiceDto } from './dto/validate-service.dto';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('admin/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @UseGuards(AdminJwtGuard)
  getAllProviders(
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) : Promise<{ data: Provider[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
    return this.providersService.getAllProviders(status, page, limit);
  }

  @Get(':id')
  @UseGuards(AdminJwtGuard)
  getProviderDetails(@Param('id') id: string) : Promise<ProviderDetails> {
    return this.providersService.getProviderDetails(id);
  }

  @Post(':id/validate')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  validateProvider(
    @Param('id') id: string,
    @Body() body: ValidateProviderDto,
  ) : Promise<{message: string}> {
    return this.providersService.validateProvider(id, body);
  }

  @Post(':id/service/:service_id/validate')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  validateService(
    @Param('service_id') service_id: string,
    @Body() body: ValidateServiceDto,
  ) : Promise<{message: string}> {
    return this.providersService.validateService(service_id, body);
  }

  @Patch(':id')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  updateProvider(
    @Param('id') id: string,
    @Body() body: UpdateProviderDto) : Promise<{message: string}> {
    return this.providersService.updateProvider(id, body);  
    }

  @Patch(':id/service/:service_id')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  updateService(
    @Param('service_id') service_id: string,
    @Body() body: UpdateServiceDto) : Promise<{message: string}> {
    return this.providersService.updateService(service_id, body); 
  }



}
