import { Body, Controller, Delete, Get, Patch, Post, Query, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { CreateShipmentDTO } from "./dto/create-shipment.dto";
import { GetShipmentsDTO } from "./dto/get-shipment.dto";

@Controller("client/deliveries")
export class DeliveryController {

    constructor(
        private readonly deliveryService: DeliveryService
    ) {}

    @Post('shipments')
    @UseInterceptors(AnyFilesInterceptor())
    async createShipment(
        @Body() createShipmentDTO: CreateShipmentDTO,
        @UploadedFiles() files: Express.Multer.File[]
    ) {

        const shipment = await this.deliveryService.createDelivery(createShipmentDTO, files);

        return { message: "Shipment received successfully!", data: shipment };
    }

    @Get("shipments")
    async getShipments(@Query() filters: GetShipmentsDTO) {
        return this.deliveryService.getShipments(filters);
    }

    @Get("shipments/:id")
    async getDeliveryById() {
        return "Delivery retrieved successfully";
    }

    @Post("shipments/:id/book")
    async bookDelivery() {
        return "Delivery booked successfully";
    }

    @Delete("shipments/:id/cancel")
    async cancelDelivery() {
        return "Delivery cancelled successfully";
    }

    @Patch("shipments/:id")
    async updateDelivery() {
        return "Delivery updated successfully";
    }

    @Delete("shipments/:id")
    async deleteDelivery() {
        return "Delivery deleted successfully";
    }

    @Post(":id/start")
    async startDelivery() {
        return "Delivery started successfully";
    }

    @Post(":id/finish")
    async finishDelivery() {
        return "Delivery finished successfully";
    }

    @Post(":id/validate")
    async validateDelivery() {
        return "Delivery validated successfully";
    }

    @Patch(":id/route")
    async updateDeliveryRoute() {
        return "Delivery route updated successfully";
    }

    @Get(":id/status")
    async getDeliveryStatus() {
        return "Delivery status retrieved successfully";
    }

    @Get("/favorites")
    async getFavoriteDeliveries() {
        return "Favorite deliveries retrieved successfully";
    }

    @Post("/favorite")
    async addFavoriteDelivery() {
        return "Favorite delivery added successfully";
    }

    @Delete("/favorite/:id")
    async removeFavoriteDelivery() {
        return "Favorite delivery removed successfully";
    }

    @Post("/comments")
    async addComment() {
        return "Comment added successfully";
    }

    @Post("/comments/:id/reply")
    async replyComment() {
        return "Comment replied successfully";
    }

}
