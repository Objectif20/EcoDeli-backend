import { Controller, Get, Body, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { WeatherData, LastDelivery, finishedDelivery, Carrier, NumberOfDeliveries, co2Saved, packages, nextServiceAsClient, CurrentBalance, CompletedService, AverageRating, revenueData, upcomingService, nearDeliveries, clientStats, PackageLocation, events, NextDelivery } from "./type";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";

@Controller('mobile/dashboard')
export class DashboardController {

    constructor(
        private readonly dashboardService: DashboardService
    ) {}

    @Get('weather')
    @UseGuards(ClientJwtGuard)
    async getWeather(@Body('user_id') userId: string): Promise<WeatherData> {
        return this.dashboardService.getWeather(userId);
    }

    @Get('last-delivery')
    @UseGuards(ClientJwtGuard)
    async getLastDelivery(@Body('user_id') userId: string): Promise<LastDelivery> {
        return this.dashboardService.getLastShipment(userId);
    }

    @Get('finished-delivery')
    @UseGuards(ClientJwtGuard)
    async getFinishedDelivery(@Body('user_id') userId: string): Promise<finishedDelivery> {
        return this.dashboardService.getFinishedDelivery(userId);
    }

    @Get('number-of-deliveries')
    @UseGuards(ClientJwtGuard)
    async getNumberOfDeliveries(@Body('user_id') userId: string): Promise<NumberOfDeliveries[]> {
        return this.dashboardService.getNumberOfDeliveries(userId);
    }

    @Get('packages')
    @UseGuards(ClientJwtGuard)
    async getPackages(@Body('user_id') userId: string): Promise<packages[]> {
        return this.dashboardService.getPackages(userId);
    }

    @Get('next-service-as-client')
    @UseGuards(ClientJwtGuard)
    async getNextServiceAsClient(@Body('user_id') userId: string): Promise<nextServiceAsClient> {
        return this.dashboardService.getNextServiceAsClient(userId);
    }

    @Get('current-balance')
    @UseGuards(ClientJwtGuard)
    async getCurrentBalance(@Body('user_id') userId: string): Promise<CurrentBalance> {
        return this.dashboardService.getCurrentBalance(userId);
    }

    @Get('near-deliveries')
    @UseGuards(ClientJwtGuard)
    async getNearDeliveries(@Body('user_id') userId: string): Promise<nearDeliveries> {
        return this.dashboardService.getNearDeliveries(userId);
    }

    @Get('client-stats')
    @UseGuards(ClientJwtGuard)
    async getClientStats(@Body('user_id') userId: string): Promise<clientStats[]> {
        return this.dashboardService.getClientStats(userId);
    }

    @Get('my-next-event')
    @UseGuards(ClientJwtGuard)
    async getMyNextEvent(@Body('user_id') userId: string): Promise<events[]> {
        return this.dashboardService.getMyNextEvent(userId);
    }

    @Get('next-delivery')
    @UseGuards(ClientJwtGuard)
    async getNextDelivery(@Body('user_id') userId: string): Promise<NextDelivery> {
        return this.dashboardService.getNextDelivery(userId);
    }


}
