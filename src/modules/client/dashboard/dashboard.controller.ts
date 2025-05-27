import { Controller, Get, Body, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { WeatherData, LastDelivery, finishedDelivery, Carrier, NumberOfDeliveries, co2Saved, packages, nextServiceAsClient, CurrentBalance, CompletedService, AverageRating, revenueData, upcomingService, nearDeliveries, clientStats, PackageLocation, events, NextDelivery } from "./type";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";

@Controller('client/dashboard')
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

    @Get('my-carriers')
    @UseGuards(ClientJwtGuard)
    async getMyCarriers(@Body('user_id') userId: string): Promise<Carrier[]> {
        return this.dashboardService.getMyCarrier(userId);
    }

    @Get('number-of-deliveries')
    @UseGuards(ClientJwtGuard)
    async getNumberOfDeliveries(@Body('user_id') userId: string): Promise<NumberOfDeliveries[]> {
        return this.dashboardService.getNumberOfDeliveries(userId);
    }

    @Get('co2-saved')
    @UseGuards(ClientJwtGuard)
    async getCo2Saved(@Body('user_id') userId: string): Promise<co2Saved[]> {
        return this.dashboardService.getCo2Saved(userId);
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

    @Get('completed-service')
    @UseGuards(ClientJwtGuard)
    async getCompletedService(@Body('user_id') userId: string): Promise<CompletedService> {
        return this.dashboardService.getCompletedService(userId);
    }

    @Get('average-rating')
    @UseGuards(ClientJwtGuard)
    async getAverageRating(@Body('user_id') userId: string): Promise<AverageRating> {
        return this.dashboardService.getAverageRating(userId);
    }

    @Get('revenue-data')
    @UseGuards(ClientJwtGuard)
    async getRevenueData(@Body('user_id') userId: string): Promise<revenueData[]> {
        return this.dashboardService.getRevenueData(userId);
    }

    @Get('upcoming-services')
    @UseGuards(ClientJwtGuard)
    async getUpcomingServices(@Body('user_id') userId: string): Promise<upcomingService[]> {
        return this.dashboardService.getUpcomingServices(userId);
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

    @Get('package-location')
    @UseGuards(ClientJwtGuard)
    async getPackageLocation(@Body('user_id') userId: string): Promise<PackageLocation[]> {
        return this.dashboardService.getPackageLocation(userId);
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

    @Get('completed-deliveries')
    @UseGuards(ClientJwtGuard)
    async getCompletedDeliveries(@Body('user_id') userId: string): Promise<CompletedService> {
        return this.dashboardService.getCompletedDeliveries(userId);
    }


}
