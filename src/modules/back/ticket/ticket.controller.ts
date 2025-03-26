import { Body, Controller, Get, Post, Patch, Delete, Param, NotFoundException, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { TicketDto } from './dto/ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from 'src/common/entities/ticket.entity';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Ticket Management')
@Controller('admin/ticket')
export class TicketController {
    constructor(private readonly ticketService: TicketService) { }

    @Get()
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get All Tickets',
        operationId: 'getAllTickets',
    })
    @ApiResponse({ status: 200, description: 'List of tickets retrieved successfully' })
    async getTickets(): Promise<Ticket[]> {
        return await this.ticketService.getTickets();
    }

    @Get('stored')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get Stored Tickets',
        operationId: 'getStoredTickets',
    })
    @ApiResponse({ status: 200, description: 'List of stored tickets retrieved successfully' })
    async getStoredTickets(): Promise<Ticket[]> {
        return await this.ticketService.getStoredTickets();
    }

    @Get(':id')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Get Ticket by ID',
        operationId: 'getTicketById',
    })
    @ApiParam({ name: 'id', description: 'The ID of the ticket' })
    @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Ticket not found' })
    async getTicketById(@Param('id') id: string): Promise<Ticket> {
        const ticket = await this.ticketService.getTicketById(id);
        if (!ticket) {
            throw new NotFoundException(`Ticket avec l'ID ${id} non trouvé.`);
        }
        return ticket;
    }

    @Post()
    @AdminRole('TICKET')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({
        summary: 'Create a Ticket',
        operationId: 'createTicket',
    })
    @ApiBody({ type: TicketDto })
    @ApiResponse({ status: 201, description: 'Ticket created successfully' })
    async createTicket(@Body() data: TicketDto): Promise<Ticket> {
        return await this.ticketService.createTicket(data);
    }

    @Patch(':id')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({
        summary: 'Update a Ticket',
        operationId: 'updateTicket',
    })
    @ApiParam({ name: 'id', description: 'The ID of the ticket' })
    @ApiBody({ type: UpdateTicketDto })
    @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
    @ApiResponse({ status: 404, description: 'Ticket not found' })
    async updateTicket(@Param('id') id: string, @Body() updateData: UpdateTicketDto): Promise<Ticket> {
        const updatedTicket = await this.ticketService.updateTicket(id, updateData);
        if (!updatedTicket) {
            throw new NotFoundException(`Impossible de mettre à jour : Ticket avec l'ID ${id} non trouvé.`);
        }
        return updatedTicket;
    }

    @Delete(':id')
    @AdminRole('TICKET')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @ApiOperation({
        summary: 'Delete a Ticket',
        operationId: 'deleteTicket',
    })
    @ApiParam({ name: 'id', description: 'The ID of the ticket' })
    @ApiResponse({ status: 200, description: 'Ticket deleted successfully' })
    @ApiResponse({ status: 404, description: 'Ticket not found' })
    async deleteTicket(@Param('id') id: string): Promise<{ message: string }> {
        const deleted = await this.ticketService.deleteTicket(id);
        if (!deleted) {
            throw new NotFoundException(`Impossible de supprimer : Ticket avec l'ID ${id} non trouvé.`);
        }
        return { message: `Ticket avec l'ID ${id} supprimé.` };
    }

    @Post('/upload')
    @AdminRole('TICKET')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @UseInterceptors(FileInterceptor('photo'))
    @ApiOperation({
        summary: 'Upload a File',
        operationId: 'uploadFile',
    })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ url: string } | { error: string }> {
        return await this.ticketService.uploadPicture(file);
    }
}
