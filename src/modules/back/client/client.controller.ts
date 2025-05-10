import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ClientService } from "./client.service";
import { AdminJwtGuard } from "src/common/guards/admin-jwt.guard";
import { AllClient, ClientDetails } from "./type";



@ApiTags('Merchant Management')
@Controller('admin/clients')
export class ClientController {
    constructor(private readonly clientService: ClientService) { }

    @Get()
    @UseGuards(AdminJwtGuard)
    async getAllClients(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ): Promise<{ data: AllClient[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
        return this.clientService.getAllClients(page, limit);
    }

    @Get(':id')
    @UseGuards(AdminJwtGuard)
    async getClientDetails(@Param('id') id: string): Promise<ClientDetails> {
        return this.clientService.getClientDetails(id);
    }
    

}
