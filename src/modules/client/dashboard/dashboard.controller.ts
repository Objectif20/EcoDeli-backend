import { Controller, Get, Body, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { WeatherData, LastDelivery, finishedDelivery, Carrier, NumberOfDeliveries, co2Saved, packages, nextServiceAsClient, CurrentBalance, CompletedService, AverageRating, revenueData, upcomingService, nearDeliveries, clientStats, PackageLocation, events, NextDelivery } from "./type";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";

@Controller('client/dashboard')
export class DashboardController {

    constructor(
        private readonly dashboardService: DashboardService
    ) {}

    @UseGuards(ClientJwtGuard)
    @Get('weather')
    async getWeather(@Body('user_id') userId: string): Promise<WeatherData> {
        return this.dashboardService.getWeather(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('last-delivery')
    async getLastDelivery(@Body('user_id') userId: string): Promise<LastDelivery> {
        return this.dashboardService.getLastDelivery(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('finished-delivery')
    async getFinishedDelivery(@Body('user_id') userId: string): Promise<finishedDelivery> {
        return this.dashboardService.getFinishedDelivery(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('my-carriers')
    async getMyCarriers(@Body('user_id') userId: string): Promise<Carrier[]> {
        return this.dashboardService.getMyCarrier(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('number-of-deliveries')
    async getNumberOfDeliveries(@Body('user_id') userId: string): Promise<NumberOfDeliveries[]> {
        return this.dashboardService.getNumberOfDeliveries(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('co2-saved')
    async getCo2Saved(@Body('user_id') userId: string): Promise<co2Saved[]> {
        return this.dashboardService.getCo2Saved(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('packages')
    async getPackages(@Body('user_id') userId: string): Promise<packages[]> {
        return this.dashboardService.getPackages(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('next-service-as-client')
    async getNextServiceAsClient(@Body('user_id') userId: string): Promise<nextServiceAsClient> {
        return this.dashboardService.getNextServiceAsClient(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('current-balance')
    async getCurrentBalance(@Body('user_id') userId: string): Promise<CurrentBalance> {
        return this.dashboardService.getCurrentBalance(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('completed-service')
    async getCompletedService(@Body('user_id') userId: string): Promise<CompletedService> {
        return this.dashboardService.getCompletedService(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('average-rating')
    async getAverageRating(@Body('user_id') userId: string): Promise<AverageRating> {
        return this.dashboardService.getAverageRating(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('revenue-data')
    async getRevenueData(@Body('user_id') userId: string): Promise<revenueData[]> {
        return this.dashboardService.getRevenueData(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('upcoming-services')
    async getUpcomingServices(@Body('user_id') userId: string): Promise<upcomingService[]> {
        return this.dashboardService.getUpcomingServices(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('near-deliveries')
    async getNearDeliveries(@Body('user_id') userId: string): Promise<nearDeliveries> {
        return this.dashboardService.getNearDeliveries(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('client-stats')
    async getClientStats(@Body('user_id') userId: string): Promise<clientStats[]> {
        return this.dashboardService.getClientStats(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('package-location')
    async getPackageLocation(@Body('user_id') userId: string): Promise<PackageLocation[]> {
        return this.dashboardService.getPackageLocation(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('my-next-event')
    async getMyNextEvent(@Body('user_id') userId: string): Promise<events[]> {
        return this.dashboardService.getMyNextEvent(userId);
    }

    @UseGuards(ClientJwtGuard)
    @Get('next-delivery')
    async getNextDelivery(@Body('user_id') userId: string): Promise<NextDelivery> {
        return this.dashboardService.getNextDelivery(userId);
    }
}
