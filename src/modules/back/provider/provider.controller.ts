import { Controller, Get, Query, Param, Body, Post, UseGuards, Patch } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { ProvidersService } from './provider.service';
import { Provider, ProviderDetails } from './types';
import { ValidateProviderDto } from './dto/validate-provider.dto';
import { ValidateServiceDto } from './dto/validate-service.dto';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@ApiTags('Provider Management')
@Controller('admin/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get All Providers',
    operationId: 'getAllProviders',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'List of providers retrieved successfully' })
  getAllProviders(
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ data: Provider[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
    return this.providersService.getAllProviders(status, page, limit);
  }

  @Get(':id')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get Provider Details',
    operationId: 'getProviderDetails',
  })
  @ApiParam({ name: 'id', description: 'The ID of the provider' })
  @ApiResponse({ status: 200, description: 'Provider details retrieved successfully' })
  getProviderDetails(@Param('id') id: string): Promise<ProviderDetails> {
    return this.providersService.getProviderDetails(id);
  }

  @Post(':id/validate')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Validate Provider',
    operationId: 'validateProvider',
  })
  @ApiParam({ name: 'id', description: 'The ID of the provider' })
  @ApiBody({ type: ValidateProviderDto })
  @ApiResponse({ status: 200, description: 'Provider validated successfully' })
  validateProvider(
    @Param('id') id: string,
    @Body() body: ValidateProviderDto,
  ): Promise<{ message: string }> {
    return this.providersService.validateProvider(id, body);
  }

  @Post(':id/service/:service_id/validate')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Validate Service',
    operationId: 'validateService',
  })
  @ApiParam({ name: 'id', description: 'The ID of the provider' })
  @ApiParam({ name: 'service_id', description: 'The ID of the service' })
  @ApiBody({ type: ValidateServiceDto })
  @ApiResponse({ status: 200, description: 'Service validated successfully' })
  validateService(
    @Param('id') id: string,
    @Param('service_id') service_id: string,
    @Body() body: ValidateServiceDto,
  ): Promise<{ message: string }> {
    return this.providersService.validateService(id, service_id, body);
  }

  @Patch(':id')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Update Provider',
    operationId: 'updateProvider',
  })
  @ApiParam({ name: 'id', description: 'The ID of the provider' })
  @ApiBody({ type: UpdateProviderDto })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  updateProvider(
    @Param('id') id: string,
    @Body() body: UpdateProviderDto
  ): Promise<{ message: string }> {
    return this.providersService.updateProvider(id, body);
  }

  @Patch(':id/service/:service_id')
  @AdminRole('PROVIDER')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @ApiOperation({
    summary: 'Update Service',
    operationId: 'updateService',
  })
  @ApiParam({ name: 'id', description: 'The ID of the provider' })
  @ApiParam({ name: 'service_id', description: 'The ID of the service' })
  @ApiBody({ type: UpdateServiceDto })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  updateService(
    @Param('id') id: string,
    @Param('service_id') service_id: string,
    @Body() body: UpdateServiceDto
  ): Promise<{ message: string }> {
    return this.providersService.updateService(id, service_id, body);
  }
}
