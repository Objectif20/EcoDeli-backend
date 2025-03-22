import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from 'src/common/entities/merchant.entity';

@Injectable()
export class MerchantService {
    constructor(
        @InjectRepository(Merchant)
        private readonly merchantRepository: Repository<Merchant>,
    ) { }

    async getAllMerchants(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [merchants, total] = await this.merchantRepository.findAndCount({
            relations: ['merchantContracts'],
            skip,
            take: limit,
        });

        const formattedMerchants = merchants.map(merchant => ({
            id: merchant.merchant_id,
            companyName: merchant.company_name,
            siret: merchant.siret,
            address: merchant.address,
            city: merchant.city,
            country: merchant.country,
            phone: merchant.phone,
            stripeCustomerId: merchant.stripe_customer_id,
            description: merchant.description,
            postalCode: merchant.postal_code,
            user: merchant.user,
            merchantContracts: merchant.merchantContracts,
            merchantSectors: merchant.merchantSectors,
            merchantDocuments: merchant.merchantDocuments,
            // ---- LIGNE A AJOUTER POUR GÉRER LES PLANS D'ABONNEMENTS
            //subscriptionPlan: merchant.merchantContracts.length > 0 ? merchant.merchantContracts[0].plan : 'No Subscription',

        }));

        return {
            data: formattedMerchants,
            meta: {
                total,
                page,
                limit,
            },
        };
    }


    async getMerchantById(id: string) {
        const merchant = await this.merchantRepository.findOne({
            where: { merchant_id: id },
            relations: ['merchantContracts', 'merchantSectors', 'merchantDocuments', 'user'],
        });

        if (!merchant) {
            throw new NotFoundException(`Merchant with ID ${id} not found`);
        }

        return {
            id: merchant.merchant_id,
            companyName: merchant.company_name,
            siret: merchant.siret,
            address: merchant.address,
            city: merchant.city,
            country: merchant.country,
            phone: merchant.phone,
            stripeCustomerId: merchant.stripe_customer_id,
            description: merchant.description,
            postalCode: merchant.postal_code,
            user: merchant.user,
            merchantContracts: merchant.merchantContracts,
            merchantSectors: merchant.merchantSectors,
            merchantDocuments: merchant.merchantDocuments,
        };
    }

    async updateMerchant(id: string, updateMerchantDto: any) {
        const merchant = await this.merchantRepository.findOne({ where: { merchant_id: id } });

        if (!merchant) {
            throw new NotFoundException(`Merchant with ID ${id} not found`);
        }

        await this.merchantRepository.update(id, updateMerchantDto);

        return this.merchantRepository.findOne({ where: { merchant_id: id } });
    }

}