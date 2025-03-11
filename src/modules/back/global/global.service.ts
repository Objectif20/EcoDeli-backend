import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { RoleList } from 'src/common/entities/role_list.entity';
import { Test } from 'src/common/schemas/test.schema';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Inject } from '@nestjs/common';

@Injectable()
export class GlobalService {
  constructor(
    @InjectModel('Test') private readonly testModel: Model<Test>,
    @InjectRepository(RoleList) private readonly roleListRepository: Repository<RoleList>, 
    @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
  ) {}

  getHello(): string {
    return 'Bienvenue sur EcoDeli';
  }


  async mongoDbTest(): Promise<Test[]> {
    try {
      const tests = await this.testModel.find().exec();
      return tests;
    } catch (error) {
      throw new Error(`Un erreur est survenue : ${error.message}`);
    }
  }

  async postgresTest(): Promise<RoleList> {
    try {
        const [firstRole] = await this.roleListRepository.find({ take: 1 });
      if (!firstRole) {
        throw new Error('Aucun rôle trouvé');
      }
      return firstRole;
    } catch (error) {
      throw new Error(`Une erreur est survenue: ${error.message}`);
    }
  }

  async sendEmail(to: string): Promise<void> {
    try {
      const fromEmail = this.mailer.options.auth.user;
      const info = await this.mailer.sendMail({
        from: fromEmail,
        to,
        subject: 'Test Email',
        text: 'Ceci est un email de test envoyé depuis NestJS.',
      });
    } catch (error) {
      throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    }
  }
}
