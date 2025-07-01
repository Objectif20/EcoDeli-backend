import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { DeliveryDetails, DeliveryOnGoing } from './type';


@ApiTags('Merchant Management')
@Controller('desktop/deliveries')
export class DeliveriesController {
    constructor(private readonly deliveriesService: DeliveriesService) { }

      @Get('ongoing')
        async getAllOngoingDeliveries(
            @Query('page') page: string,
            @Query('limit') limit: string,
        ): Promise<{ totalRows: number; deliveries: DeliveryOnGoing[] }> {
            const pageNumber = parseInt(page, 10) || 1;
            const limitNumber = parseInt(limit, 10) || 10;

            return await this.deliveriesService.getOngoingDeliveries(pageNumber, limitNumber);
        }

        @Get(':id')
        async getDeliveryDetail(@Param('id') delivery_id: string): Promise<DeliveryDetails> {
        return this.deliveriesService.getDeliveryDetails('', delivery_id);
        }

}
