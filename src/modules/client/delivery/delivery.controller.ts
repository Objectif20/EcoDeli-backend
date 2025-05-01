import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { CreateShipmentDTO } from "./dto/create-shipment.dto";
import { GetShipmentsDTO } from "./dto/get-shipment.dto";
import { CreateDeliveryDto } from "./dto/create-delivery.dto";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";
import { BookPartialDTO } from "./dto/book-partial.dto";
import { HistoryDelivery } from "./types";

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

    @Get("warehouses")
    async getWarehouses() {
        return this.deliveryService.getWarehouseList();
    }

    @Get("myCurrentShipments")
    @UseGuards(ClientJwtGuard)
    async getCurrentPendingShipments(
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.getMyCurrentShipments(user_id);
    }

    @Get("onGoingDeliveries")
    @UseGuards(ClientJwtGuard)
    async getOngoingDeliveries(
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.getOngoingDeliveries(user_id);
    }

    @Post("delivery/:id/taken")
    @UseGuards(ClientJwtGuard)
    async takeDelivery(
        @Param("id") deliveryId : string,
        @Body("user_id") user_id : string,
        @Body("secretCode") secretCode : string,
    ) {
        return this.deliveryService.takeDeliveryPackage(deliveryId, user_id, secretCode);
    }

    @Post("delivery/:id/finish")
    @UseGuards(ClientJwtGuard)
    async finishDelivery(
        @Param("id") deliveryId : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.finishDelivery(deliveryId, user_id);
    }

    @Post("delivery/:id/validate")
    @UseGuards(ClientJwtGuard)
    async validateDelivery(
        @Param("id") deliveryId : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.validateDelivery(deliveryId, user_id);
    }

    @Get("delivery/myHistory")
    @UseGuards(ClientJwtGuard)
    async getMyHistory(
        @Body("user_id") user_id : string,
        @Query("page") page : number,
        @Query("limit") limit : number,
    ) : Promise<{ data: HistoryDelivery[], totalRows: number }> {
        console.log("user_id", user_id);
        return this.deliveryService.getMyDeliveryHistory(user_id, page, limit);
    }

    @Get("delivery/reviews")
    @UseGuards(ClientJwtGuard)
    async getMyReviews(
        @Body("user_id") user_id : string,
        @Query("page") page : number,
        @Query("limit") limit : number,
    ) {
        return this.deliveryService.getReviewsForDeliveryPerson(user_id, page, limit);
    }

    @Post("delivery/reviews/:id/reply")
    @UseGuards(ClientJwtGuard)
    async replyToComment(
        @Param("id") comment_id : string,
        @Body("user_id") user_id : string,
        @Body("content") content : string,
    ) {
        return this.deliveryService.replyComment(comment_id, user_id, content);
    }

    @Get("delivery/myReviews")
    @UseGuards(ClientJwtGuard)
    async getMyReviewsAsClient(
        @Body("user_id") user_id : string,
        @Query("page") page : number,
        @Query("limit") limit : number,
    ) {
        return this.deliveryService.getMyReviewsAsClient(user_id, page, limit);
    }


    @Get(":id")
    async getShipmentById(
        @Param("id") shipment_id : string,
    ) {
        return this.deliveryService.getShipmentById(shipment_id);
    }

    @Post(":id/book")
    @UseGuards(ClientJwtGuard)
    async bookShipment(
        @Param("id") shipment_id : string,
        @Body("user_id") user_id : string,
    ) {
        return this.deliveryService.bookShipment(shipment_id, user_id);
    }

    @Post(':id/bookPartial')
    @UseGuards(ClientJwtGuard)
    async bookPartial(
        @Param('id') id: string,
        @Body() bookPartialDTO: BookPartialDTO,
    ) {
        return this.deliveryService.bookPartial(bookPartialDTO, id);
    }

    @Post(":id/askNegociation")
    async askNegociation(
        @Param("id") shipment_id : string,
        @Body("user_id") user_id : string
    )
    {
        return this.deliveryService.askToNegociate(shipment_id, user_id);
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

}
