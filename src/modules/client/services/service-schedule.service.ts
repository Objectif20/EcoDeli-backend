import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointments } from "src/common/entities/appointments.entity";
import { Between, IsNull, Repository } from "typeorm";
import * as nodemailer from 'nodemailer';

@Injectable()
export class ServiceScheduleService {

    constructor(
        @InjectRepository(Appointments)
        private readonly appointmentsRepository: Repository<Appointments>,
        @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
    ){

    }

    @Cron('*/5 * * * *')
    async sendEmailBeforeAppointment() {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        const appointments = await this.appointmentsRepository.find({
            where: {
                service_date: Between(now, oneHourLater),
                code: IsNull()
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

            console.log(`Envoi du code ${code} à ${firstName} ${lastName} (${email}) pour le rendez-vous ${appointment.appointment_id}`);
            await this.mailer.sendMail({
                from: fromEmail,
                to: email,
                subject: 'Rappel de rendez-vous',
                text: `Bonjour ${firstName} ${lastName},

                    Dans une heure a lieu votre rendez-vous avec ${providerName} pour le service "${serviceName}". 
                    Merci de fournir le code suivant pour débuter la prestation : ${code}

                    Cordialement,
                    EcoDeli.`,});

            appointment.code = code;
            await this.appointmentsRepository.save(appointment);
        }
    }

}