import { Injectable, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(
    @Inject('NodeMailer') private readonly transporter: nodemailer.Transporter,
  ) {}

  public async sendEmail(to: string, subject: string, text: string, html: string) {
    const mailOptions = {
      from: process.env.GMAIL_USER, 
      to, 
      subject, 
      text, 
      html, 
    };

    try {
      const info = await this.transporter.sendMail(mailOptions); 
      console.log('Message envoyé:', info.messageId);
      return info;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du mail:', error);
      throw error;
    }
  }
}
