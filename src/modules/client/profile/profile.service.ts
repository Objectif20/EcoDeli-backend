import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Client } from "src/common/entities/client.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Plan } from "src/common/entities/plan.entity";
import { Providers } from "src/common/entities/provider.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { Users } from "src/common/entities/user.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { MoreThan, Repository } from "typeorm";

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
      private readonly minioService: MinioService,
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
  }