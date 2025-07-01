import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from 'src/common/entities/merchant.entity';
import { Report } from 'src/common/entities/report.entity';
import { Shipment } from 'src/common/entities/shipment.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { MinioService } from 'src/common/services/file/minio.service';
import { AllMerchant, MerchantDetails } from './type';

@Injectable()
export class MerchantService {
    constructor(
        @InjectRepository(Merchant)
        private readonly merchantRepository: Repository<Merchant>,

        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,

        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,

        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,

        private readonly minioService: MinioService,
    ) { }

    async getAllMerchants(page: number = 1, limit: number = 10): Promise<{ data: AllMerchant[]; meta: { total: number; page: number; limit: number } }> {
        const skip = (page - 1) * limit;
    
        const [merchants, total] = await this.merchantRepository.findAndCount({
            relations: ['merchantContracts', 'user'],
            skip,
            take: limit,
        });
    
        const formattedMerchants: AllMerchant[] = await Promise.all(
            merchants.map(async (merchant) => {
                let photoUrl: string | null = null;
    
                if (merchant.user?.profile_picture) {
                    const bucketName = 'client-images';
                    const imageName = merchant.user.profile_picture;
                    photoUrl = await this.minioService.generateImageUrl(bucketName, imageName);
                }
    
                return {
                    id: merchant.merchant_id,
                    companyName: merchant.company_name,
                    siret: merchant.siret,
                    address: merchant.address,
                    city: merchant.city,
                    country: merchant.country,
                    phone: merchant.phone,
                    description: merchant.description || '',
                    postalCode: merchant.postal_code || '',
                    profilePicture: photoUrl,
                    firstName: merchant.first_name || '',
                    lastName: merchant.last_name || '',
                };
            })
        );
    
        return {
            data: formattedMerchants,
            meta: {
                total,
                page,
                limit,
            },
        };
    }
    
    async getMerchantById(id: string): Promise<MerchantDetails> {
        const merchant = await this.merchantRepository.findOne({
            where: { merchant_id: id },
            relations: ['merchantContracts', 'merchantSectors', 'merchantDocuments', 'user'],
        });
    
        if (!merchant) {
            throw new NotFoundException(`Merchant with ID ${id} not found`);
        }
    
        const reportCount = await this.reportRepository.count({
            where: { user: { user_id: merchant.user.user_id } }
        });
    
        const shipmentCount = await this.shipmentRepository.count({
            where: { user: { user_id: merchant.user.user_id } }
        });
    
        const activeSubscription = await this.subscriptionRepository.findOne({
            where: {
                user: { user_id: merchant.user.user_id },
                status: 'active'
            },
            relations: ['plan']
        });
    
        const currentPlanName = activeSubscription?.plan?.name || null;
    
        let photoUrl: string | null = null;
        if (merchant.user?.profile_picture) {
            const bucketName = 'client-images';
            const imageName = merchant.user.profile_picture;
            photoUrl = await this.minioService.generateImageUrl(bucketName, imageName);
        }

        let contractUrl = await this.minioService.generateImageUrl("client-documents", merchant.contract_url || '');
    
        return {
            info: {
                profile_picture: photoUrl,
                first_name: merchant.first_name || '',
                last_name: merchant.last_name || '',
                description: merchant.description || '',
                email: merchant.user?.email || '',
                phone: merchant.phone || '',
                nbDemandeDeLivraison: shipmentCount,
                nomAbonnement: currentPlanName || "Free",
                nbSignalements: reportCount,
                entreprise: merchant.company_name || '',
                siret: merchant.siret || '',
                pays: merchant.country || '',
                contractUrl : contractUrl || ""
            }
        };
    }

}