import { Body, Controller, Get, Param, Post, NotFoundException, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportDto } from './dto/report.dto';
import { Report } from 'src/common/entities/report.entity';

@Controller('admin/reporting')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    // GET admin/reportings : Liste des signalements avec pagination et filtres
    @Get()
    async getReports(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('filter') filter?: string
    ): Promise<{ data: Partial<Report>[]; meta: { total: number; page: number; limit: number } }> {
        return await this.reportService.getReports(page, limit, filter);
    }

    // GET admin/reporting/:id : Détail d'un signalement
    @Get(':id')
    async getReportById(@Param('id') id: string): Promise<Report> {
        const report = await this.reportService.getReportById(id);
        if (!report) {
            throw new NotFoundException(`Signalement avec l'ID ${id} non trouvé.`);
        }
        return report;
    }

    // POST admin/reporting/:id : Réponse à la réalisation d'un signalement
    @Post(':id')
    async answerReport(@Param('id') id: string, @Body() body: { message: string }): Promise<{ message: string }> {
        const report = await this.reportService.answerReport(id, body.message);
        if (!report) {
            throw new NotFoundException(`Signalement avec l'ID ${id} non trouvé.`);
        }
        return { message: 'La réponse au signalement a bien été enregistrée et l\'email envoyé.' };
    }

    // POST admin/reporting/:id/attribution : Attribution du signalement à un administrateur
    @Post(':id/attribution')
    async assignReport(@Param('id') id: string, @Body() body: { admin_id: string }): Promise<{ message: string }> {
        const result = await this.reportService.assignReport(id, body.admin_id);
        if (!result) {
            throw new NotFoundException(`Signalement avec l'ID ${id} non trouvé.`);
        }
        return { message: `Le signalement a été attribué à l'administrateur.` };
    }
}
