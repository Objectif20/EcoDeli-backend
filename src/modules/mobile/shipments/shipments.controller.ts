import { Body, Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ShipmentsService } from "./shipments.service";
import { ApiTags } from "@nestjs/swagger";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";

@ApiTags('Client Profile Management')
@Controller('mobile/shipments')
export class ShipmentsController {


    constructor(
        private readonly shipmentsService : ShipmentsService,
    ){}

    @Get("active")
    @UseGuards(ClientJwtGuard)
    async getShipments(
        @Body("user_id") user_id : string,
    ) {
        return this.shipmentsService.getShipmentListItems(user_id);
    }

    @Get(":id")
    @UseGuards(ClientJwtGuard)
    async getShipmentById(
        @Body("user_id") user_id : string,
        @Param("id") shipment_id : string,
    ) {
        return this.shipmentsService.getShipmentDetails(shipment_id, user_id);
    }


}