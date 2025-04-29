import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { CreateShipmentDTO } from "./dto/create-shipment.dto";
import { GetShipmentsDTO } from "./dto/get-shipment.dto";
import { CreateDeliveryDto } from "./dto/create-delivery.dto";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";

@Controller("client/shipments")
export class DeliveryController {

    constructor(
        private readonly deliveryService: DeliveryService
    ) {}

    @Post()
    @UseGuards(ClientJwtGuard)
    @UseInterceptors(AnyFilesInterceptor())
    async createShipment(
        @Body() createShipmentDTO: CreateShipmentDTO,
        @UploadedFiles() files: Express.Multer.File[],
        @Req() req: { user: { user_id: string }; body: any }
    ) {

        const shipment = await this.deliveryService.createDelivery(createShipmentDTO, files, req.user.user_id);

        return { message: "Shipment received successfully!", data: shipment };
    }

    @Get()
    async getShipments(@Query() filters: GetShipmentsDTO) {
        return this.deliveryService.getShipments(filters);
    }

    @Get(":id")
    async getShipmentById(
        @Param("id") shipment_id : string,
    ) {
        return this.deliveryService.getShipmentById(shipment_id);
    }

    @Post(":id/book")
    async bookShipment() {
        // Création de la livraison + des différents bordereau de colis
        return "Delivery booked successfully";
    }

    @Delete("delivery/:id/cancel")
    async cancelDelivery(
        @Param("id") deliveryId : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.cancelDelivery(deliveryId, user_id);
    }

    @Patch(":id")
    async updateShipment() {
        return "Delivery updated successfully";
    }

    @Post('step')
    async createShipmentStep(@Body() createDeliveryDto: CreateDeliveryDto, @Body('updatedAmount') updatedAmount: number) {
      const delivery = await this.deliveryService.createStepDelivery(createDeliveryDto, updatedAmount);
      return { message: 'Shipment step created successfully', delivery };
    }

    @Post("negociate")
    async negotiateShipment(
        @Body("shipment_id") shipmentId : string,
        @Body("user_id") user_id : string,
        @Body("updatedPrice") updatedPrice : number,

    ) {
        return this.deliveryService.createNegotiatedDelivery(shipmentId, user_id, updatedPrice);
    }

    @Delete(":id")
    async deleteShipment(
        @Param("id") shipmentId : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.deleteShipment(shipmentId, user_id);
    }

    @Post("delivery/:id/start")
    async startDelivery(
        @Param("id") delivery_id : string,
        @Body("delivery_code") delivery_code : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.startDelivery(delivery_id, delivery_code, user_id);
    }

    @Post("delivery/:id/finish")
    async finishDelivery(
        @Param("id") deliveryId : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.finsihDelivery(deliveryId, user_id);
    }

    @Post("delivery/:id/validate")
    async validateDelivery(
        @Param("id") deliveryId : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.validateDelivery(deliveryId, user_id);
    }

    @Patch(":id/route")
    async updateDeliveryRoute() {
        return "Delivery route updated successfully";
    }

    @Get("delivery/:id/status")
    async getDeliveryStatus(
        @Param("id") deliveryId : string,
    ) {
        return this.deliveryService.getDeliveryStatus(deliveryId);
    }

    @Get("favorites")
    async getFavoriteShipments(
        @Query("page") page : number,
        @Query("limit") limit : number,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.getShipmentFavorites(user_id, page, limit);
    }

    @Post("favorite")
    async addFavoriteDelivery(
        @Body("user_id") user_id : string,
        @Body("shipment_id") shipment_id : string,
    ) {
        return this.deliveryService.addToFavorites(user_id, shipment_id);
    }

    @Delete("favorite/:id")
    async removeFavoriteDelivery(
        @Body("user_id") user_id : string,
        @Body("shipment_id") shipment_id : string,
    ) {
        return this.deliveryService.removeFromFavorites(user_id, shipment_id);
    }

    @Post("delivery/:id/comments")
    async addComment(
        @Body("comment") comment : string,
        @Body("user_id") user_id : string,
        @Param("id") delivery_id : string,
    ) {
        return this.deliveryService.addComment(comment, user_id, delivery_id);
    }

    @Post("delivery/:id/comments/:comment_id/reply")
    async replyComment(
        @Body("comment") comment : string,
        @Body("user_id") user_id : string,
        @Param("id") delivery_id : string,
        @Param("comment_id") comment_id : string,

    ) {
        return this.deliveryService.replyComment(comment, user_id, delivery_id, comment_id);
    }

}
