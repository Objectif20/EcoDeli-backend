import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointments } from 'src/common/entities/appointments.entity';
import { Between, IsNull, Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { OneSignalService } from 'src/common/services/notification/oneSignal.service';

@Injectable()
export class ServiceScheduleService {
  constructor(
    @InjectRepository(Appointments)
    private readonly appointmentsRepository: Repository<Appointments>,
    @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
    private readonly oneSignalService: OneSignalService,
  ) {}

  @Cron('*/5 * * * *')
  async sendEmailBeforeAppointment() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const appointments = await this.appointmentsRepository.find({
      where: {
        service_date: Between(now, oneHourLater),
        code: IsNull(),
      },
      relations: ['client', 'client.user', 'service', 'provider'],
    });

    const fromEmail = this.mailer.options.auth.user;

    for (const appointment of appointments) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const email = appointment.client?.user?.email;
      const firstName = appointment.client?.first_name;
      const lastName = appointment.client?.last_name;
      const providerName = appointment.provider.first_name + ' ' + appointment.provider.last_name;
      const serviceName = appointment.service.name;
      await this.mailer.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Rappel de rendez-vous',
        html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; background: #f7f9f8;">
      <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
      <p>Dans une heure a lieu votre rendez-vous avec <strong>${providerName}</strong> pour le service "<em>${serviceName}</em>".</p>
      <p>Merci de fournir le code suivant pour débuter la prestation :<br>
        <span style="display: inline-block; padding: 10px 20px; background-color: #2a9d8f; color: white; border-radius: 5px; font-weight: bold; font-size: 1.2em;">${code}</span>
      </p>
      <p>Cordialement,<br>L'équipe EcoDeli</p>
    </div>
  `,
      });

      // On envoie une notif (navigateur ou mobile)
      await this.oneSignalService.sendNotification(
        appointment.client?.user?.user_id,
        'Rappel Rendez-vous',
        `Votre rendez-vous avec ${providerName} est dans 1h. Voici le code à fournir : ${code}`,
      );

      appointment.code = code;
      await this.appointmentsRepository.save(appointment);
    }
  }
}
