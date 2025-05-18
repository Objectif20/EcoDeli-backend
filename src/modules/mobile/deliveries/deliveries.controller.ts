import { ApiTags } from "@nestjs/swagger";
import { DeliveriesService } from "./deliveries.service";
import { Body, Controller, Get, UseGuards } from "@nestjs/common";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";
import { ActiveDeliveryAsClient } from "./type";

@ApiTags('Client Profile Management')
@Controller('mobile/deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService : DeliveriesService) {}


  @Get('active')
  @UseGuards(ClientJwtGuard)
    async getActiveDeliveries(@Body() body: { user_id: string }) : Promise<ActiveDeliveryAsClient[]> {
        const { user_id } = body;
        return this.deliveriesService.getActiveDeliveries(user_id);
    }

}