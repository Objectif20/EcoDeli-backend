import { ApiTags } from "@nestjs/swagger";
import { DeliveriesService } from "./deliveries.service";
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
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

  @Get(":id")
  @UseGuards(ClientJwtGuard)
  async getDeliveryById(
      @Param("id") delivery_id : string,
      @Body("user_id") user_id : string,
  ) {
      return this.deliveriesService.getDeliveryDetails(user_id, delivery_id);
  }


  @Post(":id/takenWithNfc")
  @UseGuards(ClientJwtGuard)
  async takeDeliveryWithNfc(
      @Param("id") delivery_id : string,
      @Body("user_id") user_id : string,
      @Body("nfc_code") nfc_code : string,
  ) {
      return this.deliveriesService.takeDeliveryPackage(delivery_id,user_id, nfc_code);
  }


}