import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DeleteResult, Like } from 'typeorm';

import { Report } from 'src/common/entities/report.entity';
import { ReportDto } from './dto/report.dto';

@Injectable()
export class ReportService {
    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
    ) {}

    // Récupération des signalements (pagination et filtres)
    async getReports(page = 1, limit = 10, filter?: string): Promise<Report[]> {
        const whereCondition = filter
            ? [{ status: Like(`%${filter}%`) }, { state: Like(`%${filter}%`) }]
            : {};

        return await this.reportRepository.find({
            where: whereCondition,
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    // Détail d'un signalement
    async getReportById(id: string): Promise<Report | null> {
        return await this.reportRepository.findOne({
            where: { report_id: id },
        });
    }

    // Répondre à un signalement
    async answerReport(id: string, message: string): Promise<Report | null> {
        const report = await this.reportRepository.findOne({
            where: { report_id: id },
        });

        if (!report) {
            return null;
        }

        // Exemple de traitement métier : changer l'état en "répondu"
        report.status = 'answered';

        // TODO : envoyer un mail ici si besoin

        return await this.reportRepository.save(report);
    }

    // Attribuer un signalement à un administrateur
    async assignReport(id: string, admin_id: string): Promise<Report | null> {
        const report = await this.reportRepository.findOne({
            where: { report_id: id },
        });

        if (!report) {
            return null;
        }

        report.assignment = admin_id;
        return await this.reportRepository.save(report);
    }

    // Optionnel : création d'un signalement
    async createReport(data: ReportDto): Promise<Report> {
        const newReport = this.reportRepository.create(data);
        return await this.reportRepository.save(newReport);
    }

    // Optionnel : suppression
    async deleteReport(id: string): Promise<boolean> {
        const result: DeleteResult = await this.reportRepository.delete(id);
        return !!(result.affected && result.affected > 0);
    }
}
