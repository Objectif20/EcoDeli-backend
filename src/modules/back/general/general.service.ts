import { InjectRepository } from "@nestjs/typeorm";
import { Contracts, VehicleCategory } from "./type";
import { Category } from "src/common/entities/category.entity";
import { Repository } from "typeorm";
import { CreateVehicleCategoryDto, UpdateVehicleCategoryDto } from "./dto/vehicles.dto";
import { NotFoundException } from "@nestjs/common";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { Providers } from "src/common/entities/provider.entity";
import { Merchant } from "src/common/entities/merchant.entity";


export class GeneralService {

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(Providers)
    private readonly providerRepository: Repository<Providers>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly minioService : MinioService
  ) { }

    async getContracts(type: string, page: number = 1, q: string = ''): Promise<{ data: Contracts[], total: number }> {
      const pageSize = 10;

      if (type === 'deliveryman') {
        const [deliveryPersons, total] = await this.deliveryPersonRepository
          .createQueryBuilder('dp')
          .leftJoinAndSelect('dp.user', 'user')
          .leftJoinAndSelect('user.clients', 'client')
          .leftJoinAndSelect('dp.DeliveryPersonDocuments', 'doc', 'doc.contact = :contact', { contact: true })
          .where(q ? `(client.last_name ILIKE :q OR client.first_name ILIKE :q)` : '1=1', { q: `%${q}%` })
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .getManyAndCount();

        const contracts: Contracts[] = [];

        for (const dp of deliveryPersons) {
          if (!dp.DeliveryPersonDocuments || dp.DeliveryPersonDocuments.length === 0) continue;

          const client = dp.user?.clients?.[0];
          const profilePicture = dp.user?.profile_picture ? (await this.minioService.generateImageUrl('client-images', dp.user?.profile_picture)) : null;
          const nom = client?.last_name ?? '';
          const prenom = client?.first_name ?? '';

          for (const doc of dp.DeliveryPersonDocuments) {
            const contratUrl = (await this.minioService.generateImageUrl('client-documents', doc.document_url)) || '';
            contracts.push({
              id: dp.delivery_person_id,
              nom,
              prenom,
              profilePicture,
              contratUrl,
              dateContrat: doc.submission_date ? doc.submission_date.toISOString() : '',
            });
          }
        }

        return { data: contracts, total };
      }
      if (type === 'provider') {
        const [providers, total] = await this.providerRepository
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.contracts', 'contract')
          .where(q ? `(p.last_name ILIKE :q OR p.first_name ILIKE :q OR p.company_name ILIKE :q)` : '1=1', { q: `%${q}%` })
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .getManyAndCount();

          console.log(providers);

        const contracts: Contracts[] = [];

        for (const p of providers) {
          const nom = p.last_name ?? '';
          const prenom = p.first_name ?? '';
          const profilePicture = p.user?.profile_picture ? (await this.minioService.generateImageUrl('client-images', p.user?.profile_picture)) : null;

          for (const contract of p.contracts) {
            const contratUrl = (await this.minioService.generateImageUrl('provider-documents', contract.contract_url)) || '';
            contracts.push({
              id: p.provider_id,
              nom,
              prenom,
              profilePicture,
              contratUrl,
              dateContrat: contract.created_at ? contract.created_at.toISOString() : '',
            });
          }
        }
        return { data: contracts, total };
      }
      if (type === 'merchant') {
        const [merchants, total] = await this.merchantRepository
          .createQueryBuilder('m')
          .where(q ? `(m.last_name ILIKE :q OR m.first_name ILIKE :q OR m.company_name ILIKE :q)` : '1=1', { q: `%${q}%` })
          .andWhere('m.contract_url IS NOT NULL') 
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .getManyAndCount();

        const contracts: Contracts[] = [];

        for (const m of merchants) {
          const nom = m.last_name ?? '';
          const profilePicture = m.user?.profile_picture ? (await this.minioService.generateImageUrl('client-images', m.user?.profile_picture)) : null;
          const prenom = m.first_name ?? '';
          const contratUrl = m.contract_url ? (await this.minioService.generateImageUrl('client-documents', m.contract_url)) : '';

          contracts.push({
            id: m.merchant_id,
            nom,
            prenom,
            profilePicture,
            contratUrl,
            dateContrat: '',
          });
        }

        return { data: contracts, total };
      }

      return { data: [], total: 0 };
    }

    async getVehicleCategories(): Promise<{ data: VehicleCategory[]; total: number }> {
      const categories = await this.categoryRepository.find();
      const vehicleCategories: VehicleCategory[] = categories.map(category => ({
        id: category.category_id !== null && category.category_id !== undefined ? String(category.category_id) : null,
        name: category.name,
        max_weight: category.max_weight || 0,
        max_dimension: typeof category.max_dimension === 'string' ? parseFloat(category.max_dimension) || 0 : category.max_dimension || 0,
      }));
      return {
        data: vehicleCategories,
        total: vehicleCategories.length,
      };
    }

    async createCategory(dto: CreateVehicleCategoryDto): Promise<Category> {
      const category = this.categoryRepository.create({
        ...dto,
        max_dimension: dto.max_dimension?.toString() ?? '0',
      });
      return await this.categoryRepository.save(category);
    }
  
    async updateCategory(id: string, dto: UpdateVehicleCategoryDto): Promise<Category> {
      console.log(id, dto);
      const category = await this.categoryRepository.findOne({
        where: { category_id: Number(id) },
      });
  
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found.`);
      }
  
      Object.assign(category, {
        ...dto,
        max_dimension: dto.max_dimension?.toString() ?? category.max_dimension,
      });
  
      return await this.categoryRepository.save(category);
    }
    

}