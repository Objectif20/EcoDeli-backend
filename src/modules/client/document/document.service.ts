import { InjectRepository } from "@nestjs/typeorm";
import { DeliveryPersonDocument } from "src/common/entities/delivery_person_documents.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Providers } from "src/common/entities/provider.entity";
import { ProviderContracts } from "src/common/entities/providers_contracts.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { Users } from "src/common/entities/user.entity";
import { Vehicle } from "src/common/entities/vehicle.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { Repository } from "typeorm";

export class DocumentService {

    constructor(

        @InjectRepository(Users)
        private readonly userRepository: Repository<Users>,
        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
        @InjectRepository(DeliveryPersonDocument)
        private readonly deliveryPersonDocumentRepository: Repository<DeliveryPersonDocument>,
        @InjectRepository(Vehicle)
        private readonly vehicleRepository: Repository<Vehicle>,
        @InjectRepository(Providers)
        private readonly providerRepository: Repository<Providers>,
        @InjectRepository(ProviderDocuments)
        private readonly providerDocumentsRepository: Repository<ProviderDocuments>,
        @InjectRepository(ProviderContracts)
        private readonly providerContractsRepository: Repository<ProviderContracts>,
        private readonly minioService: MinioService


    ) {

    }

    async getMyProfileDocuments(user_id: string) {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: [
          'language',
          'subscriptions',
          'subscriptions.plan',
          'clients',
          'merchant',
          'deliveryPerson',
        ],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const client = user.clients?.[0] ?? null;
      const merchant = user.merchant ?? null;
      const deliveryPerson = user.deliveryPerson ?? null;

      const profile: string[] = [];
      if (client) profile.push('CLIENT');
      if (merchant) profile.push('MERCHANT');
      if (deliveryPerson) profile.push('DELIVERYMAN');

      const provider = await this.providerRepository.findOne({ where: { user: { user_id } } });
      if (provider) profile.push('PROVIDER');

      const nodes: any[] = [];


      if (profile.includes('DELIVERYMAN')) {
        const deliveryDocuments = await this.deliveryPersonDocumentRepository.find({
          where: { delivery_person: { delivery_person_id: deliveryPerson.delivery_person_id } },
        });

        const deliveryNodes = await Promise.all(deliveryDocuments.map(async (doc) => ({
          name: doc.name,
          url: await this.minioService.generateImageUrl('client-documents', doc.document_url),
        })));

        const vehicleList = await this.vehicleRepository.find({
          where: { deliveryPerson: { delivery_person_id: deliveryPerson.delivery_person_id } },
          relations: ['vehicleDocuments'],
        });

        const vehicleNodes = await Promise.all(
          vehicleList.map(async (vehicle) => ({
            name: vehicle.registration_number,
            nodes: await Promise.all(vehicle.vehicleDocuments.map(async (doc) => ({
              name: doc.name,
              url: await this.minioService.generateImageUrl('client-documents', doc.vehicle_document_url),
            }))),
          }))
        );

        nodes.push({
          name: 'Profil Transporteur',
          nodes: [
            { name: 'Mes justificatifs', nodes: deliveryNodes },
            { name: 'Mes véhicules', nodes: vehicleNodes },
          ],
        });
      }

      if (profile.includes('CLIENT')) {
        nodes.push({
          name: 'Profil Particulier',
          nodes: [
            {
              name: 'Factures',
              nodes: [
              ],
            },
          ],
        });
      }

      if (profile.includes('MERCHANT')) {
        nodes.push({
          name: 'Profil Commerçant',
          nodes: [
            {
              name: 'Mes documents',
              nodes: [
              ],
            },
          ],
        });
      }

    if (profile.includes('PROVIDER') && provider) {
        const providerDocuments = await this.providerDocumentsRepository.find({
          where: { provider: { provider_id: provider.provider_id } }
        });

        const providerDocumentsNodes = await Promise.all(providerDocuments.map(async (doc) => ({
          name: doc.name,
          description: doc.description,
          submission_date: doc.submission_date,
          url: await this.minioService.generateImageUrl('provider-documents', doc.provider_document_url),
        })));

        const providerContracts = await this.providerContractsRepository.find({
          where: { provider: { provider_id: provider.provider_id } }
        });

        const providerContractsNodes = await Promise.all(providerContracts.map(async (contract) => {
        const fileName = contract.contract_url.split('/').pop();
        return {
            name: fileName,
            siret: contract.siret,
            address: contract.address,
            url: await this.minioService.generateImageUrl('provider-documents', contract.contract_url),
        };
        }));

        nodes.push({
          name: 'Profil Prestataire',
          nodes: [
            {
              name: 'Mes justificatifs',
              nodes: providerDocumentsNodes,
            },
            {
              name: 'Mon contrat',
              nodes: providerContractsNodes,
            },
          ],
        });
      }

      return {
        name: 'Mes documents',
        nodes,
      };
    }

}