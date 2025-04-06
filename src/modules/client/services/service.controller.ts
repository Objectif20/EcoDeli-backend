import { Controller, Post, Get, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ServiceService } from './service.service';

@Controller('client/service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  createService(@Body() data: any) {
    return this.serviceService.createService(data);
  }

  @Get()
  getServices(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('city') city?: string
  ) {
    return this.serviceService.getValidatedServices(page, limit, search, city);
  }

  @Get(':id')
  getServiceById(@Param('id') id: string) {
    return this.serviceService.getServiceDetails(id);
  }

  @Post(':id/appointments')
  createAppointment(@Param('id') id: string, @Body() data: any) {
    return this.serviceService.createAppointment(id, data);
  }

  @Get(':id/appointments')
  getAppointments(@Param('id') id: string) {
    return this.serviceService.getServiceAppointments(id);
  }

  @Patch(':id')
  updateService(@Param('id') id: string, @Body() data: any) {
    return this.serviceService.updateService(id, data);
  }

  @Delete(':id')
  deleteService(@Param('id') id: string) {
    return this.serviceService.deleteService(id);
  }

  @Post(':id/favorite')
  addFavorite(@Param('id') id: string, @Body() body: { user_id: string }) {
    return this.serviceService.addFavorite(id, body.user_id);
  }

  @Delete(':id/favorite')
  removeFavorite(@Param('id') id: string, @Body() body: { user_id: string }) {
    return this.serviceService.removeFavorite(id, body.user_id);
  }

  @Post(':id/comments')
  addComment(@Param('id') service_id: string, @Body() body: { user_id: string, content: string, rating: number }) {
    return this.serviceService.addComment(service_id, body.user_id, body.content, body.rating);
  }

  @Post('comments/:id/reply')
  replyToComment(@Param('id') comment_id: string, @Body() body: { provider_id: string, content: string }) {
    return this.serviceService.replyToComment(comment_id, body.provider_id, body.content);
  }
}
