import {  Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Client } from "src/common/entities/client.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Plan } from "src/common/entities/plan.entity";
import { Providers } from "src/common/entities/provider.entity";
import { Users } from "src/common/entities/user.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { In, MoreThan, Repository } from "typeorm";
import { CalendarEvent, ProfileClient } from "./type";
import { Report } from "src/common/entities/report.entity";
import { v4 as uuidv4 } from 'uuid';
import { OneSignalService } from "src/common/services/notification/oneSignal.service";
import { Appointments } from "src/common/entities/appointments.entity";
import { Delivery } from "src/common/entities/delivery.entity";


  @Injectable()
  export class ProfileService {
    constructor(
      @InjectRepository(Users)
      private readonly userRepository: Repository<Users>,
      @InjectRepository(Client)
      private readonly clientRepository: Repository<Client>,
      @InjectRepository(Merchant)
      private readonly merchantRepository: Repository<Merchant>,
      @InjectRepository(DeliveryPerson)
      private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
      @InjectRepository(Providers)
      private readonly providerRepository: Repository<Providers>,
      @InjectRepository(Plan)
      private readonly planRepository: Repository<Plan>,
      @InjectRepository(Report)
      private readonly reportRepository: Repository<Report>,
      @InjectRepository(Appointments)
      private readonly appointmentRepo: Repository<Appointments>,
      @InjectRepository(Delivery)
      private readonly deliveryRepository: Repository<Delivery>,
      private readonly onesignalService: OneSignalService,
      private readonly minioService: MinioService,
    ) {}
  
    async getMyProfile(user_id: string): Promise<ProfileClient> {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: ['subscriptions', 'subscriptions.plan'],
      });
    
      if (!user) {
        throw new Error('User not found');
      }
    
      const client = await this.clientRepository.findOne({ where: { user: { user_id } } });
      const deliverymanExists = await this.deliveryPersonRepository.count({ where: { user: { user_id } } });
      const provider = await this.providerRepository.findOne({ where: { user: { user_id } } });
    
      const profile: string[] = [];
      if (client) profile.push('CLIENT');
      if (deliverymanExists > 0) profile.push('DELIVERYMAN');
    
      let first_name = 'N/A';
      let last_name = 'N/A';
      let validateProfile = false;

       if (client) {
        first_name = client.first_name;
        last_name = client.last_name;
        if (deliverymanExists > 0) {
          const deliveryman = await this.deliveryPersonRepository.findOne({ where: { user: { user_id } } });
          if (deliveryman) {
            validateProfile = deliveryman.validated;
          }
        } else {
          validateProfile = true;
        }
      }
    
      const latestSubscription = user.subscriptions?.sort((a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
    
      const planName = latestSubscription?.plan?.name || null;
    
      let upgradablePlan: boolean | null = null;
    
      if (!provider && latestSubscription?.plan) {
        const currentPrice = latestSubscription.plan.price;
        console.log('currentPrice', currentPrice);
        const higherPlans = currentPrice !== undefined
          ? await this.planRepository.count({
              where: { price: MoreThan(currentPrice) },
            })
          : 0;
        upgradablePlan = higherPlans > 0;
      }

      let photoUrl = user.profile_picture;
      if (user.profile_picture) {
        const bucketName = 'client-images';
        const imageName = user.profile_picture;
        photoUrl = await this.minioService.generateImageUrl(bucketName, imageName);
      }
    
      const userData = {
        user_id: user.user_id,
        first_name,
        last_name,
        email: user.email,
        photo: photoUrl || null,
        active: !user.banned,
        profile,
        otp: user.two_factor_enabled,
        upgradablePlan,
        validateProfile,
        planName,
      };
    
      return userData;
    }   

    async createReport(user_id : string, content : string): Promise<Report> {
      const user = await this.userRepository.findOne({ where: { user_id: user_id } });
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }
  
      const report = this.reportRepository.create({
        user,
        report_message: content,
        status: 'pending',
        state: 'new',
      });
  
      return this.reportRepository.save(report);
    }

    async getPlanning(user_id: string): Promise<CalendarEvent[]> {
        const client = await this.clientRepository.findOne({
          where: { user: { user_id } },
        });

        if (!client) {
          throw new Error('Client not found');
        }

        const deliveryPerson = await this.deliveryPersonRepository.findOne({
          where: { user: { user_id } },
        });

        const eventTable: CalendarEvent[] = [];

        const appointments = await this.appointmentRepo.find({
          where: { client: { client_id: client.client_id } },
          relations: ['service', 'provider'],
        });

        for (const appointment of appointments) {
          const start = appointment.service_date;
          const end = new Date(start.getTime() + (appointment.duration ?? 60) * 60000);
          const providerName = appointment.provider
            ? `${appointment.provider.first_name ?? ''} ${appointment.provider.last_name ?? ''}`.trim()
            : 'Fournisseur non défini';

          const serviceName = `Prestation : ${appointment.service?.name}` || 'Service non défini';

          eventTable.push({
            id: `appointment-${appointment.appointment_id}`,
            title: serviceName,
            description: `Prestation avec ${providerName}`,
            location: appointment.service?.city ?? 'Ville non définie',
            start,
            end,
            allDay: false,
          });
        }

        if (deliveryPerson) {
          const deliveries = await this.deliveryRepository.find({
            where: {
              delivery_person: { delivery_person_id: deliveryPerson.delivery_person_id },
              status: In(['pending', 'taken', 'finished']),
            },
            relations: ['shipment', 'shipment.user', 'shipment.user.clients'],
          });

          for (const delivery of deliveries) {
            const start = delivery.send_date;
            const end = delivery.delivery_date ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
            const shipmentUser = delivery.shipment.user;

            const userName = shipmentUser.clients?.[0]
              ? `${shipmentUser.clients[0].first_name} ${shipmentUser.clients[0].last_name}`
              : 'Expéditeur inconnu';

            eventTable.push({
              id: `delivery-${delivery.delivery_id}`,
              title: `Livraison pour ${userName}`,
              description: `Statut: ${delivery.status}`,
              location: 'Lieu de livraison',
              start,
              end,
              allDay: false,
            });
          }
        }

        return eventTable;
    }

    async getNewNfcCode(user_id: string): Promise<{ nfc_code: string }> {

      const deliveryPerson = await this.deliveryPersonRepository.findOne({
        where: { user: { user_id } },
      });

      console.log('Delivery Person:', deliveryPerson);

      const nfcCode = `NFC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      if (deliveryPerson) {
        deliveryPerson.nfc_code = nfcCode;
        await this.deliveryPersonRepository.save(deliveryPerson);
      } else {
        throw new NotFoundException('Delivery person not found');
      }

      return { nfc_code: nfcCode};

    }

    async updateProfile(
      user_id: string,
      first_name?: string,
      last_name?: string,
      file?: Express.Multer.File
    ): Promise<ProfileClient> {
      const client = await this.clientRepository.findOne({
        where: { user: { user_id } },
        relations: ['user'],
      });

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      if (first_name !== undefined && first_name !== "") {
        client.first_name = first_name;
      }

      if (last_name !== undefined && last_name !== "") {
        client.last_name = last_name;
      }

      await this.clientRepository.save(client);

      if (file) {
        const oldPath = client.user.profile_picture;
        const filename = `${user_id}/image-${uuidv4()}.${file.originalname.split('.').pop()}`;
        const bucket = 'client-images';

        const uploaded = await this.minioService.uploadFileToBucket(bucket, filename, file);
        if (!uploaded) throw new Error("Erreur lors de l'upload");

        if (oldPath) {
          await this.minioService.deleteFileFromBucket(bucket, oldPath);
        }

        client.user.profile_picture = filename;
        await this.userRepository.save(client.user);
      }

      return this.getMyProfile(user_id);
    }

    async registerNewDevice(userId: string, playerId: string): Promise<void> {
      const user = await this.userRepository.findOne({ where: { user_id: userId } });
      if (!user) {
        throw new Error('User not found');
      }
    
      const existingDevice = await this.onesignalService.getPlayerIdsForUser(userId);
      if (existingDevice.some(device => device.player_id === playerId)) {
        return;
      }
    
      await this.onesignalService.registerDevice(userId, playerId, "mobile");
    }


  }