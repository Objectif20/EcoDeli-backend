import { Body, Controller, Get, Param, Post, NotFoundException, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { ReportDto } from './dto/report.dto';
import { Report } from 'src/common/entities/report.entity';

interface ReportResponse {
    report_id: string;
    status: string;
    report_message?: string;
    state: string;
    user: {
        user_id: string;
        email: string;
    };
    admin: {
        admin_id: string;
        first_name: string;
        last_name: string;
        email: string;
    }[];
}

@ApiTags('Report Management')
@Controller('admin/reporting')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Get()
    @ApiOperation({
        summary: 'Get All Reports',
        operationId: 'getAllReports',
    })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'filter', required: false, description: 'Filter criteria' })
    @ApiResponse({ status: 200, description: 'List of reports retrieved successfully' })
    async getReports(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('filter') filter?: string
    ): Promise<{ data: ReportResponse[]; meta: { total: number; page: number; limit: number } }> {
        return await this.reportService.getReports(page, limit, filter);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get Report by ID',
        operationId: 'getReportById',
    })
    @ApiParam({ name: 'id', description: 'The ID of the report' })
    @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Report not found' })
    async getReportById(@Param('id') id: string): Promise<ReportResponse> {
        const report = await this.reportService.getReportById(id);
        if (!report) {
            throw new NotFoundException(`Signalement avec l'ID ${id} non trouvé.`);
        }
        return report;
    }

    @Post(':id')
    @ApiOperation({
        summary: 'Answer a Report',
        operationId: 'answerReport',
    })
    @ApiParam({ name: 'id', description: 'The ID of the report' })
    @ApiResponse({ status: 200, description: 'Report answered successfully' })
    @ApiResponse({ status: 404, description: 'Report not found' })
    async answerReport(@Param('id') id: string, @Body() body: { message: string }): Promise<{ message: string }> {
        const report = await this.reportService.answerReport(id, body.message);
        if (!report) {
            throw new NotFoundException(`Signalement avec l'ID ${id} non trouvé.`);
        }
        return { message: 'La réponse au signalement a bien été enregistrée et l\'email envoyé.' };
    }

    @Post(':id/attribution')
    @ApiOperation({
        summary: 'Assign a Report to an Admin',
        operationId: 'assignReport',
    })
    @ApiParam({ name: 'id', description: 'The ID of the report' })
    @ApiResponse({ status: 200, description: 'Report assigned successfully' })
    @ApiResponse({ status: 404, description: 'Report not found' })
    async assignReport(@Param('id') id: string, @Body() body: { admin_attribute: string }): Promise<{ message: string }> {
        const result = await this.reportService.assignReport(id, body.admin_attribute);
        if (!result) {
            throw new NotFoundException(`Signalement avec l'ID ${id} non trouvé.`);
        }
        return { message: `Le signalement a été attribué à l'administrateur.` };
    }
}
