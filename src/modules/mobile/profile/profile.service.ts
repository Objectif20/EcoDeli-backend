import {  Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Client } from "src/common/entities/client.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Plan } from "src/common/entities/plan.entity";
import { Providers } from "src/common/entities/provider.entity";
import { Users } from "src/common/entities/user.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { MoreThan, Repository } from "typeorm";
import { CalendarEvent, ProfileClient } from "./type";
import { Report } from "src/common/entities/report.entity";
import { v4 as uuidv4 } from 'uuid';
import { OneSignalService } from "src/common/services/notification/oneSignal.service";


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
      const user = await this.userRepository.findOne({
        where: { user_id },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }

      return [
        {
          id: '1',
          title: 'Réunion d\'équipe',
          description: 'Réunion hebdomadaire avec l\'équipe projet.',
          start: new Date('2025-05-20T10:00:00'),
          end: new Date('2025-05-20T11:00:00'),
          allDay: false,
          location: 'Salle de réunion 2B',
        },
        {
          id: '2',
          title: 'Déjeuner client',
          description: 'Déjeuner avec le client pour discuter des nouvelles fonctionnalités.',
          start: new Date('2025-05-20T12:30:00'),
          end: new Date('2025-05-20T14:00:00'),
          allDay: false,
          location: 'Le Bistro Parisien',
        },
        {
          id: '3',
          title: 'Journée Télétravail',
          start: new Date('2025-05-22T00:00:00'),
          end: new Date('2025-05-22T23:59:59'),
          allDay: true,
          location: 'Domicile',
        },
        {
          id: '4',
          title: 'Sprint Planning',
          description: 'Planification du sprint avec l\'équipe Agile.',
          start: new Date('2025-05-23T09:00:00'),
          end: new Date('2025-05-23T10:30:00'),
          allDay: false,
          location: 'Salle de conférence A',
        }
      ];
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