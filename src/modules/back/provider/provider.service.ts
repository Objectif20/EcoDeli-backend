import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Providers } from 'src/common/entities/provider.entity';
//import { ProviderKeywords } from 'src/common/entities/provider_keyword.entity';
//import { ProviderDocuments } from 'src/common/entities/providers_documents.entity';
//import { Services } from 'src/common/entities/service.entity';
//import { Users } from 'src/common/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Providers)
    private providersRepository: Repository<Providers>,
    //@InjectRepository(Users)
    //private usersRepository: Repository<Users>,
    //@InjectRepository(ProviderDocuments)
    //private documentsRepository: Repository<ProviderDocuments>,
    //@InjectRepository(Services)
    //private servicesRepository: Repository<Services>,
    //@InjectRepository(ProviderKeywords)
    //private keywordsRepository: Repository<ProviderKeywords>,
  ) {}

    async getAllProviders(status?: string, page: number = 1, limit: number = 10) {
      const skip = (page - 1) * limit;
      const queryBuilder = this.providersRepository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.user', 'user');
  
      if (status) {
        const isValidated = status === 'valid';
        queryBuilder.where('provider.validated = :validated', { validated: isValidated });
      }
  
      const [providers, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();
  
      const result = providers.map(provider => ({
        email: provider.user?.email || 'N/A',
        name: `${provider.first_name} ${provider.last_name}`,
        company: provider.company_name,
        status: provider.validated ? 'okay' : 'wait',
        profile_picture: provider.user?.profile_picture || 'https://media.istockphoto.com/id/1437816897/photo/business-woman-manager-or-human-resources-portrait-for-career-success-company-we-are-hiring.jpg?s=612x612&w=0&k=20&c=tyLvtzutRh22j9GqSGI33Z4HpIwv9vL_MZw_xOE19NQ=',
      }));
  
      return {
        data: result,
        meta: {
          total,
          page,
          limit,
        },
      };
    }

  async getProviderDetails(id: string) {
    const provider = await this.providersRepository.findOne({
      where: { provider_id: id },
      relations: ['user', 'documents', 'services', 'services.serviceList', 'services.serviceList.keywords'],
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const details = {
      info: {
        name: `${provider.first_name} ${provider.last_name}`,
        email: provider.user?.email || 'N/A',
        company: provider.company_name,
        siret: provider.siret,
        address: provider.address,
        phone: provider.phone,
      },
      documents: provider.documents,
      services: provider.services.map(service => ({
        name: service.serviceList.name,
        description: service.serviceList.description,
        status: service.serviceList.status,
        keywords: service.serviceList.keywords.map(keyword => keyword.keywordList.keyword),
      })),
    };

    return details;
  }
}
