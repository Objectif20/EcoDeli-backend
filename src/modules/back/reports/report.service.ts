import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DeleteResult, Like } from 'typeorm';

import { Report } from 'src/common/entities/report.entity';
import { ReportDto } from './dto/report.dto';
import { Users } from 'src/common/entities/user.entity';
import { AdminReport } from 'src/common/entities/admin_reports.entity';
import { Admin } from 'src/common/entities/admin.entity'; // Si tu as une entity Admin séparée
import { DataSource } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Inject } from '@nestjs/common';

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
@Injectable()
export class ReportService {
    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,

        @InjectRepository(AdminReport)
        private readonly adminReportRepository: Repository<AdminReport>,

        @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter, // Injection du mailer
    ) {}

    // Récupération des signalements (pagination et filtres)
    async getReports(
        page = 1,
        limit = 10,
        filter?: string
    ): Promise<{ data: ReportResponse[]; meta: { total: number; page: number; limit: number } }> {
        const skip = (page - 1) * limit;

        const [report, total] = await this.reportRepository.createQueryBuilder('report')
            .leftJoinAndSelect('report.user', 'user')
            .leftJoinAndSelect('report.adminReports', 'adminReport')
            .leftJoinAndSelect('adminReport.admin', 'admin')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        const result = report.map(report => ({
            report_id: report.report_id,
            status: report.status,
            report_message: report.report_message,
            state: report.state,
            user: {
                user_id: report.user?.user_id,
                email: report.user?.email,
            },
            admin: report.adminReports.map(ar => ({
                admin_id: ar.admin?.admin_id,
                first_name: ar.admin?.first_name,
                last_name: ar.admin?.last_name,
                email: ar.admin?.email,
            }))
        }));

        return {
            data: result,
            meta: {
                total,
                page,
                limit,
            },
        };
    }

    // Détail d'un signalement avec les infos user et admin
async getReportById(id: string): Promise<ReportResponse | null> {
    const report = await this.reportRepository.createQueryBuilder('report')
        .leftJoinAndSelect('report.user', 'user')
        .leftJoinAndSelect('report.adminReports', 'adminReport')
        .leftJoinAndSelect('adminReport.admin', 'admin')
        .where('report.report_id = :id', { id })
        .getOne();

    if (!report) {
        return null;
    }

    const result: ReportResponse = {
        report_id: report.report_id,
        status: report.status,
        report_message: report.report_message,
        state: report.state,
        user: {
            user_id: report.user?.user_id,
            email: report.user?.email,
        },
        admin: report.adminReports.map(ar => ({
            admin_id: ar.admin?.admin_id,
            first_name: ar.admin?.first_name,
            last_name: ar.admin?.last_name,
            email: ar.admin?.email,
        }))
    };

    return result;
}

async answerReport(id: string, message: string): Promise<Report | null> {
    const report = await this.reportRepository.findOne({
        where: { report_id: id },
        relations: ['user'], 
    });

    if (!report) {
        return null;
    }

    // Changement du statut
    report.status = 'answered';
    await this.reportRepository.save(report);

    // Envoi de l'email à l'utilisateur
    console.log('Tentative d\'envoi de mail à', report.user.email);
    try {
        const fromEmail = this.mailer.options.auth.user;
        await this.mailer.sendMail({
            from: fromEmail,
            to: report.user?.email, 
            subject: 'Votre signalement a reçu une réponse',
            text: `Bonjour,\n\nVotre signalement a été traité. Voici la réponse :\n\n${message}\n\nMerci.`,
        });
        console.log('Email envoyé avec succès');
    } catch (error) {
        console.error(`Erreur lors de l'envoi de l'email : ${error.message}`);
    }

    return report;
}

    async assignReport(reportId: string, adminId: string): Promise<AdminReport | null> {
        // Vérifier si le report existe
        const report = await this.reportRepository.findOne({ where: { report_id: reportId } });
        if (!report) {
            return null;
        }
    
        // Créer la liaison dans la table admin_report
        const adminReport = this.adminReportRepository.create({
            report: { report_id: reportId },
            admin: { admin_id: adminId },
        });
        return await this.adminReportRepository.save(adminReport);        
        
    }
    
    async deleteReport(id: string): Promise<boolean> {
        const result: DeleteResult = await this.reportRepository.delete(id);
        return !!(result.affected && result.affected > 0);
    }
}
