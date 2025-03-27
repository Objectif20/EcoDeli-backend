import { Controller, Delete, Get, Patch, Post } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";

@Controller("client/deliveries")
export class DeliveryController {

    constructor(
        private readonly deliveryService: DeliveryService
    ) {}

    @Post()
    async createDelivery() {
        return "Delivery created successfully";
    }

    @Get()
    async getDeliveries() {
        return "Deliveries retrieved successfully";
    }

    @Get(":id")
    async getDeliveryById() {
        return "Delivery retrieved successfully";
    }

    @Post(":id/book")
    async bookDelivery() {
        return "Delivery booked successfully";
    }

    @Delete(":id/cancel")
    async cancelDelivery() {
        return "Delivery cancelled successfully";
    }

    @Patch(":id")
    async updateDelivery() {
        return "Delivery updated successfully";
    }

    @Delete(":id")
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

}
