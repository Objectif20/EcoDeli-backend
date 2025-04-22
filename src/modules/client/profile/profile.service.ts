import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Client } from "src/common/entities/client.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Plan } from "src/common/entities/plan.entity";
import { Providers } from "src/common/entities/provider.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { Users } from "src/common/entities/user.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { In, MoreThan, Repository } from "typeorm";
import { UpdateMyBasicProfileDto } from "./dto/update-basic-profile.dto";
import { Blocked } from "src/common/entities/blocked.entity";
import { v4 as uuidv4 } from "uuid";
import { Report } from "src/common/entities/report.entity";
import { CreateReportDto } from "./dto/create-report.dto";
import { StripeService } from "src/common/services/stripe/stripe.service";
import Stripe from "stripe";
import { error } from "console";
import { Availability } from "src/common/entities/availibities.entity";
import { AvailabilityDto } from "./dto/availitity.dto";

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
      @InjectRepository(ProviderDocuments)
      private readonly providerDocumentsRepository: Repository<ProviderDocuments>,
      @InjectRepository(Blocked)
      private readonly blockedRepository: Repository<Blocked>,
      @InjectRepository(Report)
      private readonly reportRepository: Repository<Report>,
      @InjectRepository(Availability)
      private readonly availabilityRepository: Repository<Availability>,
      private readonly minioService: MinioService,
      private readonly stripeService: StripeService
    ) {}
  
    async getMyProfile(user_id: string): Promise<any> {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: ['language', 'subscriptions', 'subscriptions.plan'],
      });
    
      if (!user) {
        throw new Error('User not found');
      }
    
      const client = await this.clientRepository.findOne({ where: { user: { user_id } } });
      const deliverymanExists = await this.deliveryPersonRepository.count({ where: { user: { user_id } } });
      const merchant = await this.merchantRepository.findOne({ where: { user: { user_id } } });
      const provider = await this.providerRepository.findOne({ where: { user: { user_id } } });
    
      const profile: string[] = [];
      if (client) profile.push('CLIENT');
      if (merchant) profile.push('MERCHANT');
      if (provider) profile.push('PROVIDER');
      if (deliverymanExists > 0) profile.push('DELIVERYMAN');
    
      let first_name = 'N/A';
      let last_name = 'N/A';
    
      if (provider) {
        first_name = provider.first_name;
        last_name = provider.last_name;
      } else if (merchant) {
        first_name = merchant.first_name;
        last_name = merchant.last_name;
      } else if (client) {
        first_name = client.first_name;
        last_name = client.last_name;
      }
    
      const latestSubscription = user.subscriptions?.sort((a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
    
      const planName = latestSubscription?.plan?.name || null;
    
      let upgradablePlan: boolean | null = null;
    
      if (!provider && latestSubscription?.plan) {
        const currentPrice = latestSubscription.plan.price;
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
        language: user.language?.language_name || 'fr',
        iso_code: user.language?.iso_code || 'FR',
        profile,
        otp: user.two_factor_enabled,
        upgradablePlan,
        planName,
      };
    
      return userData;
    }


    async getMyBasicProfile(user_id: string): Promise<any> {
      const user = await this.userRepository.findOne({ where: { user_id } });
    
      if (!user) {
        throw new Error('Utilisateur introuvable');
      }
    
      const client = await this.clientRepository.findOne({ where: { user: { user_id } } });
      const merchant = await this.merchantRepository.findOne({ where: { user: { user_id } } });
      const provider = await this.providerRepository.findOne({ where: { user: { user_id } } });
    
      let first_name = 'N/A';
      let last_name = 'N/A';
    
      if (provider) {
        first_name = provider.first_name;
        last_name = provider.last_name;
      } else if (merchant) {
        first_name = merchant.first_name;
        last_name = merchant.last_name;
      } else if (client) {
        first_name = client.first_name;
        last_name = client.last_name;
      }
    
      return {
        email: user.email,
        first_name,
        last_name,
        newsletter: user.newsletter,
      };
    }
    
    async updateMyBasicProfile(
      user_id: string,
      dto: UpdateMyBasicProfileDto,
    ): Promise<{ message: string }> {
      const user = await this.userRepository.findOne({ where: { user_id } });
    
      if (!user) {
        throw new Error('Utilisateur introuvable');
      }
    
      const { email, first_name, last_name, newsletter } = dto;
    
      if (email) user.email = email;
      if (typeof newsletter === 'boolean') user.newsletter = newsletter;
    
      const provider = await this.providerRepository.findOne({ where: { user: { user_id } } });
      const merchant = await this.merchantRepository.findOne({ where: { user: { user_id } } });
      const client = await this.clientRepository.findOne({ where: { user: { user_id } } });
    
      if (first_name || last_name) {
        if (provider) {
          if (first_name) provider.first_name = first_name;
          if (last_name) provider.last_name = last_name;
          await this.providerRepository.save(provider);
        } else if (merchant) {
          if (first_name) merchant.first_name = first_name;
          if (last_name) merchant.last_name = last_name;
          await this.merchantRepository.save(merchant);
        } else if (client) {
          if (first_name) client.first_name = first_name;
          if (last_name) client.last_name = last_name;
          await this.clientRepository.save(client);
        }
      }
    
      await this.userRepository.save(user);
    
      return { message: 'Profil mis à jour avec succès' };
    }

    async getProfileWithBlocked(user_id: string): Promise<any> {
      // Récupération de l'utilisateur principal
      const user = await this.userRepository.findOne({ where: { user_id } });
    
      if (!user) throw new NotFoundException('User not found');
    
      const profilePictureUrl = user.profile_picture
        ? await this.minioService.generateImageUrl('client-images', user.profile_picture)
        : null;
    
      // Récupération des utilisateurs bloqués par l'utilisateur
      const blockedUsers = await this.blockedRepository.find({
        where: { user_id },
      });
    
      const blockedIds = blockedUsers.map((b) => b.user_id_blocked);
    
      if (blockedIds.length === 0) {
        return {
          photo: profilePictureUrl,
          blocked: [],
        };
      }
    
      // Récupération des entités Users correspondantes
      const users = await this.userRepository.find({
        where: { user_id: In(blockedIds) },
      });
    
      const userIds = users.map((u) => u.user_id);
    
      // Récupération des rôles associés
      const [clients, merchants, providers] = await Promise.all([
        this.clientRepository.find({ where: { user: { user_id: In(userIds) } }, relations: ['user'] }),
        this.merchantRepository.find({ where: { user: { user_id: In(userIds) } }, relations: ['user'] }),
        this.providerRepository.find({ where: { user: { user_id: In(userIds) } }, relations: ['user'] }),
      ]);
    
      const getName = (u: Users) => {
        const provider = providers.find((p) => p.user.user_id === u.user_id);
        if (provider) return { first_name: provider.first_name, last_name: provider.last_name };
    
        const merchant = merchants.find((m) => m.user.user_id === u.user_id);
        if (merchant) return { first_name: merchant.first_name, last_name: merchant.last_name };
    
        const client = clients.find((c) => c.user.user_id === u.user_id);
        if (client) return { first_name: client.first_name, last_name: client.last_name };
    
        return { first_name: 'N/A', last_name: 'N/A' };
      };
    
      const blockedList = await Promise.all(
        users.map(async (u) => {
          const name = getName(u);
          const photo = u.profile_picture
            ? await this.minioService.generateImageUrl('client-images', u.profile_picture)
            : null;
    
          return {
            user_id: u.user_id,
            ...name,
            photo,
          };
        }),
      );
    
      return {
        photo: profilePictureUrl,
        blocked: blockedList,
      };
    }

    async deleteBlocked(user_id: string, blocked_user_id: string): Promise<{ message: string }> {
      const block = await this.blockedRepository.findOne({
        where: { user_id, user_id_blocked: blocked_user_id },
      });
  
      if (!block) throw new NotFoundException('Relation de blocage non trouvée');
  
      await this.blockedRepository.remove(block);
      return { message: 'Utilisateur débloqué avec succès' };
    }
  
    async updateProfilePicture(user_id: string, file: Express.Multer.File): Promise<{ url: string }> {
      const user = await this.userRepository.findOne({ where: { user_id } });
      if (!user) throw new NotFoundException('Utilisateur introuvable');
  
      const oldPath = user.profile_picture;
      const filename = `${user_id}/image-${uuidv4()}`;
      const bucket = 'client-images';
  
      const uploaded = await this.minioService.uploadFileToBucket(bucket, filename, file);
      if (!uploaded) throw new Error("Erreur lors de l'upload");
  
      if (oldPath) {
        await this.minioService.deleteFileFromBucket(bucket, oldPath);
      }
  
      user.profile_picture = filename;
      await this.userRepository.save(user);
  
      const url = await this.minioService.generateImageUrl(bucket, filename);
      return { url };
    }

    async createReport(dto: CreateReportDto): Promise<Report> {
      const user = await this.userRepository.findOne({ where: { user_id: dto.user_id } });
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }
  
      const report = this.reportRepository.create({
        user,
        report_message: dto.report_message,
        status: 'pending',
        state: 'new',
      });
  
      return this.reportRepository.save(report);
    }



    async getStripeAccountId(userId: string): Promise<string | null> {
      const provider = await this.providerRepository.findOne({
        where: { user: { user_id: userId } },
      });
      if (provider?.stripe_transfer_id) return provider.stripe_transfer_id;
    
      const delivery = await this.deliveryPersonRepository.findOne({
        where: { user: { user_id: userId } },
      });
      if (delivery?.stripe_transfer_id) return delivery.stripe_transfer_id;
    
      return null;
    }
    
    async getOrCreateStripeAccountId(userId: string, accountToken: string): Promise<string> {
      const user = await this.userRepository.findOne({
        where: { user_id: userId },
        relations: ['providers', 'deliveryPerson', 'clients'],
      });
    
      if (!user) throw new Error('User not found');
    
      const existingId = await this.getStripeAccountId(userId);
      if (existingId) return existingId;
    
      const isProvider = (user.providers ?? []).length > 0;
      const isDelivery = user.deliveryPerson != null;
    
      if (!isProvider && !isDelivery) {
        throw new Error("L'utilisateur n’est ni provider ni livreur.");
      }
        
      if (isProvider) {
        const provider = user.providers[0];
        const stripeAccount = await this.stripeService.createConnectedAccountWithToken(accountToken);
        const accountLinkUrl = await this.stripeService.createAccountLink(stripeAccount.id);
        console.log('URL pour compléter le profil:', accountLinkUrl);

        provider.stripe_transfer_id = stripeAccount.id;
        await this.providerRepository.save(provider);
        return stripeAccount.id;
      }
    
      if (isDelivery) {
        const delivery = user.deliveryPerson;
        const client = user.clients[0];
        if (!client) throw new Error("Le livreur n’a pas de profil client associé.");
        const stripeAccount = await this.stripeService.createConnectedAccountWithToken(accountToken);
        const accountLinkUrl = await this.stripeService.createAccountLink(stripeAccount.id);
        console.log('URL pour compléter le profil:', accountLinkUrl);

        delivery.stripe_transfer_id = stripeAccount.id;
        await this.deliveryPersonRepository.save(delivery);
        return stripeAccount.id;
      }
    
      throw new Error("Impossible de créer un compte Stripe.");
    }
    
    async isStripeAccountValid(user_id: string): Promise<{
      valid: boolean,
      enabled: boolean,
      needs_id_card: boolean,
      url_complete?: string
    }> {
      const stripeAccountId = await this.getStripeAccountId(user_id);
      if (!stripeAccountId) {
        return { valid: false, enabled: false, needs_id_card: false };
      }
    
      const { isValid, isEnabled, needsIdCard } = await this.stripeService.getStripeAccountStatus(stripeAccountId);
    
      const urlComplete = !isEnabled
        ? await this.stripeService.createAccountLink(stripeAccountId)
        : undefined;
    
      return {
        valid: isValid,
        enabled: isEnabled,
        needs_id_card: needsIdCard,
        url_complete: urlComplete,
      };
    }

    
    // Provider 

    async getMyDocuments(user_id: string): Promise<any[]> {
      const provider = await this.providerRepository.findOne({
        where: { user: { user_id } },
        relations: ['user'],
      });
  
      if (!provider) {
        throw new Error('Provider not found for this user.');
      }
  
      const documents = await this.providerDocumentsRepository.find({
        where: { provider: { provider_id: provider.provider_id } },
      });
  
      const bucketName = 'provider-documents';
  
      const result = await Promise.all(
        documents.map(async (doc) => {
          const url = await this.minioService.generateImageUrl(bucketName, `${provider.provider_id}/documents/${doc.name}`);
          return {
            ...doc,
            download_url: url,
          };
        }),
      );
  
      return result;
    }
  
    async addDocument(
      user_id: string,
      name: string,
      file: Express.Multer.File,
      description?: string,
    ): Promise<any> {
      const provider = await this.providerRepository.findOne({
        where: { user: { user_id } },
        relations: ['user'],
      });
  
      if (!provider) {
        throw new Error('Provider not found for this user.');
      }
  
      const filePath = `${provider.provider_id}/documents/${name}`;
      const bucketName = 'provider-documents';
  
      const uploaded = await this.minioService.uploadFileToBucket(bucketName, filePath, file);
  
      if (!uploaded) {
        throw new Error("Erreur lors de l'upload du document");
      }
  
      const newDoc = this.providerDocumentsRepository.create({
        name,
        description,
        provider_document_url: filePath,
        provider,
      });
  
      await this.providerDocumentsRepository.save(newDoc);
  
      const downloadUrl = await this.minioService.generateImageUrl(bucketName, filePath);
  
      return {
        message: 'Document uploaded successfully',
        document: {
          ...newDoc,
          download_url: downloadUrl,
        },
      };
    }

    async getAvailabilityForUser(userId: string): Promise<Availability[]> {
      const provider = await this.providerRepository.findOne({
        where: { user : {user_id: userId} },
        relations: ['availabilities'], 
      });
  
      if (!provider) {
        throw new Error('Provider not found for the given user ID');
      }
  
      return provider.availabilities; 
    }
  
    async updateAvailabilityForUser(userId: string, availabilitiesDto: AvailabilityDto[]): Promise<Availability[]> {
      const provider = await this.providerRepository.findOne({
        where: { user: { user_id: userId } },
        relations: ["availabilities"],
      });
    
      if (!provider) {
        throw new Error('Provider not found for the given user ID');
      }
    
      if (provider.availabilities?.length) {
        await this.availabilityRepository.delete({ provider: provider });
      }
    
      const newAvailabilities = availabilitiesDto.map(dto =>
        this.availabilityRepository.create({
          provider,
          day_of_week: dto.day_of_week,
          morning: dto.morning,
          morning_start_time: dto.morning_start_time,
          morning_end_time: dto.morning_end_time,
          afternoon: dto.afternoon,
          afternoon_start_time: dto.afternoon_start_time,
          afternoon_end_time: dto.afternoon_end_time,
          evening: dto.evening,
          evening_start_time: dto.evening_start_time,
          evening_end_time: dto.evening_end_time,
        })
      );
    
      return this.availabilityRepository.save(newAvailabilities);
    }



    async getMyProfileDocuments() {

      return   {
        name: "Home",
        nodes: [
          {
            name: "Documents",
            nodes: [
              { name: "report.pdf", url: "https://console.minio.remythibaut.fr/api/v1/buckets/test/objects/download?prefix=CV2A_V2.pdf&version_id=null" },
              {
                name: "Factures",
                nodes: [
                  { name: "January.pdf" },
                  { name: "February.pdf" },
                ],
              },
              {
                name: "Contrats",
                nodes: [
                  { name: "Contract-2023.pdf" },
                  { name: "NDA-2023.pdf" },
                ],
              },
              {
                name: "Rapports",
                nodes: [
                  { name: "Annual-Report-2023.pdf" },
                  { name: "Project-Review.pdf" },
                ],
              },
              {
                name: "Correspondance",
                nodes: [
                  { name: "Letter-to-Client.pdf" },
                  { name: "Internal-Memo.pdf" },
                ],
              },
            ],
          },
          { name: "passwords.txt" },
        ],
      }


    }

    


  }