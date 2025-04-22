import { Controller, Post, Get, Patch, Delete, Param, Body, Query, UseInterceptors, UploadedFiles, Req, UseGuards } from '@nestjs/common';
import { ServiceService } from './service.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CreateServiceDto } from './dto/create-service.dto';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';

@Controller('client/service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @UseGuards(ClientJwtGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async createService(
    @Body() data: CreateServiceDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.user_id;
    console.log("userId récupéré:", userId);

    return this.serviceService.createService(
      { ...data, user_id: userId },
      files,
      userId,
    );
  }

  @Get('me')
  @UseGuards(ClientJwtGuard)
  async getServicesByUser(
    @Body('user_id') user_id: string,
    @Query('page') page: number,
    @Query('total') limit: number,
  ) {
    return this.serviceService.getMyServices(user_id, Number(page), Number(limit));
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

  @Get('reviews')
  @UseGuards(ClientJwtGuard)
  async getProviderReviews(
    @Body() body: { user_id: string, page?: number, limit?: number }
  ) {
    const { user_id, page = 1, limit = 10 } = body;
    return this.serviceService.getReviewsByUserId(user_id, page, limit);
  }

  @Post('reviews/:reviews_id/reply')
  @UseGuards(ClientJwtGuard)
  async replyToReview(
    @Param('reviews_id') reviews_id: string,
    @Body() body: { user_id: string, content: string }
  ) {
    const { user_id, content } = body;
    return this.serviceService.replyToReview(reviews_id, user_id, content);
  }

  @Get(':id')
  getServiceById(@Param('id') id: string) {
    return this.serviceService.getServiceDetails(id);
  }

  @Post(':id/appointments')
  @UseGuards(ClientJwtGuard)
  createAppointment(@Param('id') service_id: string,
  @Body() data: {user_id : string, service_date: Date}) {
    return this.serviceService.createAppointment(service_id, data);
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

  @Get(':id/providerDisponibility')
  getProviderDisponibility(@Param('id') service_id: string) {
    return this.serviceService.getProviderDisponibility(service_id);
  }


}
