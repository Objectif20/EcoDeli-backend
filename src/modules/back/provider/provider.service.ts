import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Providers } from 'src/common/entities/provider.entity';
import { Repository } from 'typeorm';
import { Provider, ProviderDetails } from './types';
import { MinioService } from 'src/common/services/file/minio.service';
import { ServicesList } from 'src/common/entities/services_list.entity';
import { Admin } from 'src/common/entities/admin.entity';
import { ValidateProviderDto } from './dto/validate-provider.dto';
import { ValidateServiceDto } from './dto/validate-service.dto';
import e from 'express';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Providers)
    private providersRepository: Repository<Providers>,
    @InjectRepository(ServicesList)
    private servicesListRepository: Repository<ServicesList>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private readonly minioService: MinioService,
  ) {}

  async getAllProviders(status?: string, page: number = 1, limit: number = 10): Promise<{ data: Provider[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.providersRepository.createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .leftJoinAndSelect('provider.services', 'services');
  
    if (status) {
      const isValidated = status === 'valid';
      queryBuilder.where('provider.validated = :validated', { validated: isValidated });
    }
  
    queryBuilder.loadRelationCountAndMap('provider.service_count', 'provider.services');
  
    const [providers, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();


      const providerBucketName = 'client-images';
  
    const result = await Promise.all(providers.map(async (provider) => {
      const profilePictureUrl = provider.user?.profile_picture
        ? await this.minioService.generateImageUrl(providerBucketName, provider.user.profile_picture)
        : null;
  
      return {
        id: provider.provider_id,
        email: provider.user?.email || 'N/A',
        name: `${provider.first_name} ${provider.last_name}`,
        rate: 0,
        service_number: provider['service_count'] || 0,
        company: provider.company_name,
        status: provider.validated === null ? 'wait' : provider.validated ? 'okay' : 'not okay',
        profile_picture: profilePictureUrl,
        phone_number: provider.phone || 'N/A',
      };
    }));
  
    return {
      data: result,
      meta: {
        total,
        page,
        limit,
      },
      totalRows: total,
    };
  }
  
  
  
  async getProviderDetails(id: string): Promise<ProviderDetails> {
    const provider = await this.providersRepository.findOne({
      where: { provider_id: id },
      relations: [
        'user',
        'documents',
        'services',
        'services.serviceList',
        'services.serviceList.keywords',
        'services.serviceList.keywords.keywordList',
        'services.serviceList.images',
        'contracts',
        'admin'
      ],
    });
  
    if (!provider) {
      throw new Error('Provider not found');
    }
  
    if (provider.admin && provider.admin.photo) {
      const adminBucketName = 'admin-images';
      provider.admin.photo = await this.minioService.generateImageUrl(adminBucketName, provider.admin.photo);
    }
  
    const userProfilePictureUrl = provider.user?.profile_picture
      ? await this.minioService.generateImageUrl('client-images', provider.user.profile_picture)
      : null;
  
    const documentsWithUrls = await Promise.all(
      provider.documents.map(async (doc) => {
        const documentBucketName = 'provider-documents';
        const url = await this.minioService.generateImageUrl(documentBucketName, doc.provider_document_url);
        return {
          id: doc.provider_documents_id,
          name: doc.name,
          description: doc.description,
          submission_date: doc.submission_date,
          url,
        };
      })
    );
  
    const servicesWithImages = await Promise.all(
      provider.services.map(async (service) => {
        const imagesWithUrls = await Promise.all(
          service.serviceList.images.map(async (image) => {
            const imageBucketName = 'provider-images';
            const url = await this.minioService.generateImageUrl(imageBucketName, image.image_service_url);
            return {
              id: image.image_service_id,
              url,
            };
          })
        );
  
        return {
          id: service.service_id,
          name: service.serviceList.name,
          description: service.serviceList.description,
          status: service.serviceList.status,
          price: service.serviceList.price || 0,
          price_admin: service.serviceList.price_admin || 0,
          duration_minute: service.serviceList.duration_minute || 0,
          available: service.serviceList.available || false,
          keywords: service.serviceList.keywords.map(keyword => ({
            id: keyword.provider_keyword_id,
            keyword: keyword.keywordList.keyword,
          })),
          images: imagesWithUrls,
        };
      })
    );
  
    const details = {
      info: {
        name: `${provider.first_name} ${provider.last_name}`,
        email: provider.user?.email || 'N/A',
        company: provider.company_name,
        siret: provider.siret,
        address: provider.address,
        phone: provider.phone,
        description: provider.description,
        postal_code: provider.postal_code,
        city: provider.city,
        country: provider.country,
        validated: provider.validated,
        service_type: provider.service_type,
        admin: provider.admin ? {
          id: provider.admin.admin_id,
          name: provider.admin.first_name + ' ' + provider.admin.last_name,
          photo: provider.admin.photo || null,
        } : null,
        profile_picture: userProfilePictureUrl, // Add the profile picture URL here
      },
      documents: documentsWithUrls,
      services: servicesWithImages,
      contracts: provider.contracts.map(contract => ({
        id: contract.provider_contract_id,
        company_name: contract.company_name,
        siret: contract.siret,
        address: contract.address,
      })),
    };
  
    return details;
  }
  

  async validateProvider(id: string, validateProviderDto: ValidateProviderDto): Promise<{message: string}> {
    const { validated, admin_id } = validateProviderDto;

    const provider = await this.providersRepository.findOne({ where: { provider_id: id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const admin = await this.adminRepository.findOne({ where: { admin_id } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    provider.validated = validated;
    provider.admin = admin;

    const save = await this.providersRepository.save(provider);

    if (save) {
      return { message: 'Provider validated' };
    } else {
      return { message: 'Provider not validated' }; 
    }
  }

  async validateService(serviceId: string, validateServiceDto: ValidateServiceDto): Promise<{message: string}> {
    const { validated, admin_id, price_admin } = validateServiceDto;

    const service = await this.servicesListRepository.findOne({ where: { service_id: serviceId } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const admin = await this.adminRepository.findOne({ where: { admin_id } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    service.validated = validated;
    service.admin = admin;
    if (price_admin && price_admin > 0) {
    service.price = price_admin;
    }

    const save = await this.servicesListRepository.save(service);

    if (save) {
      return { message: 'Provider validated' };
    } else {
      return { message: 'Provider not validated' }; 
    }
  }

  async updateProvider(id: string, updateProviderDto: UpdateProviderDto): Promise<{message: string}> {
    const provider = await this.providersRepository.findOne({ where: { provider_id: id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    provider.company_name = updateProviderDto.company_name ?? provider.company_name;
    provider.siret = updateProviderDto.siret ?? provider.siret;
    provider.address = updateProviderDto.address ?? provider.address;
    provider.service_type = updateProviderDto.service_type ?? provider.service_type;
    provider.description = updateProviderDto.description ?? provider.description;
    provider.postal_code = updateProviderDto.postal_code ?? provider.postal_code;
    provider.city = updateProviderDto.city ?? provider.city;
    provider.country = updateProviderDto.country ?? provider.country;
    provider.phone = updateProviderDto.phone ?? provider.phone;
    provider.validated = updateProviderDto.validated ?? provider.validated;
    provider.last_name = updateProviderDto.last_name ?? provider.last_name;
    provider.first_name = updateProviderDto.first_name ?? provider.first_name;
    provider.user.email = updateProviderDto.email ?? provider.user.email;

    const save = await this.providersRepository.save(provider);

    if (save) {
      return { message: 'Provider updated' };
    } else {
      return { message: 'Provider not updated' }; 
    }
  }

  async updateService(id: string, updateServiceDto: UpdateServiceDto): Promise<{message: string}> {
    const service = await this.servicesListRepository.findOne({ where: { service_id: id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.service_type = updateServiceDto.service_type ?? service.service_type;
    service.status = updateServiceDto.status ?? service.status;
    service.validated = updateServiceDto.validated ?? service.validated;
    service.name = updateServiceDto.name ?? service.name;
    service.description = updateServiceDto.description ?? service.description;
    service.city = updateServiceDto.city ?? service.city;
    service.price = updateServiceDto.price ?? service.price;
    service.price_admin = updateServiceDto.price_admin ?? service.price_admin;
    service.duration_minute = updateServiceDto.duration_minute ?? service.duration_minute;
    service.available = updateServiceDto.available ?? service.available;

    const save = await this.servicesListRepository.save(service);

    if (save) {
      return { message: 'Service updated' };
    } else {
      return { message: 'Service not updated' };
    }
  }




  
}
