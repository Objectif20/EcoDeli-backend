import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { DeliveryManService, Route, RoutePostDto } from './deliveryman.service';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';

@Controller('client/deliveryman')
export class DeliveryManController {
  constructor(private readonly deliveryManService: DeliveryManService) {}

  @Post('trips')
  @UseGuards(ClientJwtGuard)
  async createTrip(
    @Query('user_id') userId: string,
    @Body() routeData: RoutePostDto,
  ) {
    return this.deliveryManService.createTrip(userId, routeData);
  }

  @Get('trips')
  @UseGuards(ClientJwtGuard)
  async getTrips(
    @Query('user_id') userId: string,
  ): Promise<Route[]> {
    return this.deliveryManService.getTripsByDeliveryPerson(userId);
  }
}
