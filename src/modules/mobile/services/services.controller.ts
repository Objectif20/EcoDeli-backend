import { Body, Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";
import { serviceHistory } from "./types";

@Controller("mobile/services")
export class ServicesController {
    constructor(
        private readonly servicesService: ServicesService,
    ) {}


      @Get('history')
      @UseGuards(ClientJwtGuard)
      async getClientHistory(
        @Body() body: { user_id: string },
        @Query('page') page = 1,
        @Query('limit') limit = 10,
      ): Promise<{
                data: serviceHistory[],
                totalRows: number,
                totalPages: number,
                currentPage: number,
                limit: number,
            }>{
        const history = await this.servicesService.getMyService(body.user_id, Number(page), Number(limit)) 
        return history;
      }

      @Get(':id')
      getServiceById(@Param('id') id: string) {
        return this.servicesService.getServiceDetails(id);
      }
}