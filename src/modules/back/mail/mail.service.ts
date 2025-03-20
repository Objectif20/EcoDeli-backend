import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Users } from "src/common/entities/user.entity";
import { Admin } from "src/common/entities/admin.entity";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { Mail } from "src/common/schemas/mail.schema";
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MinioService } from "src/common/services/file/minio.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PaginatedMailsResponse } from "./type";

@Injectable()
export class AdminMailService {
    constructor(
        @InjectModel('Mail') private readonly mailModel: Model<Mail>,
        @InjectRepository(Users) private readonly usersRepository: Repository<Users>,
        @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
        private readonly minioService: MinioService,
        @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async handleCron() {
        const now = new Date();
        const mailsToSend = await this.mailModel.find({
        send: false,
        scheduled_time: { $lte: now },
        }).exec();

        for (const mail of mailsToSend) {
        await this.sendNewsletterToEveryone(
            mail.admin_id,
            mail.subject,
            mail.message
        );
        mail.send = true;
        await mail.save();
        }
    }

    @Cron(CronExpression.EVERY_MINUTE) 
    async handleProfileCron() {
        const now = new Date();
        const mailsToSend = await this.mailModel.find({
        send: false,
        scheduled_time: { $lte: now },
        profile: { $exists: true, $ne: [] },
        }).exec();

        for (const mail of mailsToSend) {
        await this.sendNewsletterToProfiles(
            mail.admin_id,
            mail.subject,
            mail.message,
            mail.profile
        );
        mail.send = true;
        await mail.save();
        }
    }


    async sendNewsletterToEveryone(adminId: string, subject: string, htmlContent: string): Promise<{ message: string }> {
        try {
            const users = await this.usersRepository.find({ where: { newsletter: true } });
    
            if (users.length === 0) {
                return { message: "Aucun utilisateur n'a accepté la newsletter." };
            }
    
            const bccEmails = users.map(user => user.email);
            const fromEmail = this.mailer.options.auth.user;
            const mailOptions = {
                from: fromEmail,
                bcc: bccEmails,
                subject: subject,
                html: htmlContent,
            };
    
            await this.mailer.sendMail(mailOptions);
    
            console.log("Email envoyé avec succès.");
    
            const mail = new this.mailModel({
                admin_id: adminId,
                subject: subject,
                message: htmlContent,
                date: new Date(),
                send: true,
                newsletter: true,
                profile: ['all'],
            });
    
            try {
                await mail.save();
                console.log("Enregistrement dans la base de données réussi.");
            } catch (dbError) {
                console.error("Erreur lors de l'enregistrement dans la base de données:", dbError);
                throw dbError;
            }
    
            return { message: 'Newsletter envoyée avec succès.' };
        } catch (error) {
            console.error("Erreur globale:", error);
            return { message: 'Erreur lors de l\'envoi de la newsletter.' };
        }
    }

    async sendNewsletterToProfiles(adminId: string, subject: string, htmlContent: string, profiles: string[]): Promise<{ message: string }> {
        try {
            const allEmails: Set<string> = new Set();
    
            for (const profile of profiles) {
                let users: { email: string }[];
    
                switch (profile) {
                    case 'admin':
                        users = await this.adminRepository.query(`
                            SELECT email FROM admins WHERE active = true
                        `);
                        break;
                    case 'merchant':
                        users = await this.usersRepository.query(`
                            SELECT DISTINCT u.email
                            FROM users u
                            INNER JOIN merchants m ON u.user_id = m.user_id
                        `);
                        break;
                    case 'provider':
                        users = await this.usersRepository.query(`
                            SELECT DISTINCT u.email
                            FROM users u
                            INNER JOIN providers p ON u.user_id = p.user_id
                        `);
                        break;
                    case 'deliveryman':
                        users = await this.usersRepository.query(`
                            SELECT DISTINCT u.email
                            FROM users u
                            INNER JOIN delivery_persons dp ON u.user_id = dp.user_id
                        `);
                        break;
                    case 'client':
                        users = await this.usersRepository.query(`
                            SELECT DISTINCT u.email
                            FROM users u
                            INNER JOIN clients c ON u.user_id = c.user_id
                        `);
                        break;
                    default:
                        return { message: `Profil non reconnu : ${profile}.` };
                }
    
                users.forEach(user => allEmails.add(user.email));
            }
    
            if (allEmails.size === 0) {
                return { message: 'Aucun utilisateur trouvé pour les profils spécifiés.' };
            }
    
            const bccEmails = Array.from(allEmails);
            const fromEmail = this.mailer.options.auth.user;
            const mailOptions = {
                from: fromEmail,
                bcc: bccEmails,
                subject: subject,
                html: htmlContent,
            };
    
            await this.mailer.sendMail(mailOptions);
    
            const mail = new this.mailModel({
                admin_id: adminId,
                subject: subject,
                message: htmlContent,
                date: new Date(),
                send: true,
                newsletter: true,
                profile: profiles,
            });
            await mail.save();
    
            return { message: `Newsletter envoyée avec succès aux utilisateurs avec les profils ${profiles.join(', ')}.` };
        } catch (error) {
            return { message: 'Erreur lors de l\'envoi de la newsletter.' };
        }
    }

    async getAllMails(page: number, limit: number): Promise<PaginatedMailsResponse> {
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
      
        const totalMails = await this.mailModel.countDocuments().exec();
        const results: PaginatedMailsResponse = {
          total: totalMails,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalMails / limit),
          results: [], // Initialisez avec un tableau vide
        };
      
        if (endIndex < totalMails) {
          results.next = {
            page: page + 1,
            limit: limit,
          };
        }
      
        if (startIndex > 0) {
          results.previous = {
            page: page - 1,
            limit: limit,
          };
        }
      
        const mails = await this.mailModel
          .find()
          .limit(limit)
          .skip(startIndex)
          .exec();
      
        for (const mail of mails) {
          const admin = await this.adminRepository.findOne({
            where: { admin_id: mail.admin_id },
          });
      
          if (admin) {
            let photoUrl: string | null = null;
            if (admin.photo) {
              const bucketName = 'admin-images';
              const imageName = admin.photo;
              photoUrl = await this.minioService.generateImageUrl(bucketName, imageName);
            }
      
            mail.admin_info = {
              full_name: `${admin.first_name} ${admin.last_name}`,
              photo: photoUrl,
            };
          } else {
            mail.admin_info = {
              full_name: 'Admin Inconnu',
              photo: null,
            };
          }
        }
      
        results.results = mails;
        return results;
      }
    

    async scheduleNewsletter(
        adminId: string,
        subject: string,
        htmlContent: string,
        day: string,
        hour: string,
        profile?: string | string[]
    ): Promise<{ message: string }> {
        try {
            const scheduledTime = new Date(`${day}T${hour}:00`);
    
            const profiles = profile ? (Array.isArray(profile) ? profile : [profile]) : ['all'];
    
            const mail = new this.mailModel({
                admin_id: adminId,
                subject: subject,
                message: htmlContent,
                date: new Date(),
                send: false,
                newsletter: true,
                profile: profiles,
                scheduled_time: scheduledTime,
            });
            await mail.save();
    
            return { message: 'Newsletter planifiée avec succès.' };
        } catch (error) {
            return { message: 'Erreur lors de la planification de la newsletter.' };
        }
    }

    
    async uploadPicture(file: Express.Multer.File): Promise<{ url: string } | { error: string }> {
        const fileExtension = path.extname(file.originalname);
        
        const uniqueFileName = `${uuidv4()}${fileExtension}`;
    
        const upload = await this.minioService.uploadFileToBucket("email", uniqueFileName, file);
    
        if (upload) {
            const url = await this.minioService.generateImageUrl("email", uniqueFileName);
            return { url };
        } else {
            return { error: "Erreur lors de l'upload de l'image" };
        }
    }

}
