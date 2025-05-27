import { InjectRepository } from "@nestjs/typeorm";
import { Appointments } from "src/common/entities/appointments.entity";
import { DeliveryPersonDocument } from "src/common/entities/delivery_person_documents.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Providers } from "src/common/entities/provider.entity";
import { ProviderContracts } from "src/common/entities/providers_contracts.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { Users } from "src/common/entities/user.entity";
import { Vehicle } from "src/common/entities/vehicle.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { In, Repository } from "typeorm";

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
        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,
        @InjectRepository(Appointments)
        private readonly appointmentRepository: Repository<Appointments>,
        private readonly minioService: MinioService
    ) {}

    async getMyProfileDocuments(user_id: string) {
        const user = await this.userRepository.findOne({
            where: { user_id },
            relations: [
                'language',
                'subscriptions',
                'subscriptions.plan',
                'clients',
                'clients.user',
                'clients.user.shipments',
                'clients.user.shipments.deliveries',
                'clients.user.shipments.deliveries.transfers',
                'merchant',
                'merchant.user',
                'merchant.user.shipments',
                'merchant.user.shipments.deliveries',
                'merchant.user.shipments.deliveries.transfers',
                'deliveryPerson',
            ],
        });

        if (!user) throw new Error('User not found');

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
            const shipments = await this.shipmentRepository.find({
                where: { user: { user_id: client.user.user_id } },
                relations: ['deliveries', 'deliveries.transfers'],
            });

            const clientDeliveryTransfers = await Promise.all(
                shipments.flatMap(shipment =>
                    shipment.deliveries.flatMap(delivery =>
                        delivery.transfers.map(async transfer => ({
                            name: `Facture ${transfer.delivery_transfer_id}`,
                            date: transfer.date,
                            amount: transfer.amount,
                            url: transfer.url
                                ? await this.minioService.generateImageUrl('client-documents', transfer.url)
                                : null,
                        }))
                    )
                )
            );

            const appointments = await this.appointmentRepository.find({
                where: { client: { client_id: client.client_id }, status: In(['in_progress', 'completed']) },
            });

            const appointmentNodes = await Promise.all(
                appointments.map(async appointment => ({
                    name: `Prestation ${appointment.appointment_id}`,
                    date: appointment.service_date,
                    amount: appointment.amount,
                    url: appointment.url_file
                        ? await this.minioService.generateImageUrl('client-documents', appointment.url_file)
                        : null,
                }))
            );

            nodes.push({
                name: 'Profil Particulier',
                nodes: [
                    {
                        name: 'Factures/Livraisons',
                        nodes: clientDeliveryTransfers,
                    },
                    {
                        name: 'Prestations',
                        nodes: appointmentNodes,
                    },
                ],
            });
        }

        if (profile.includes('MERCHANT')) {
            const shipments = await this.shipmentRepository.find({
                where: { user: { user_id: merchant.user.user_id } },
                relations: ['deliveries', 'deliveries.transfers'],
            });

            const merchantDeliveryTransfers = await Promise.all(
                shipments.flatMap(shipment =>
                    shipment.deliveries.flatMap(delivery =>
                        delivery.transfers.map(async transfer => ({
                            name: `Facture ${transfer.delivery_transfer_id}`,
                            date: transfer.date,
                            amount: transfer.amount,
                            url: transfer.url
                                ? await this.minioService.generateImageUrl('client-documents', transfer.url)
                                : null,
                        }))
                    )
                )
            );

            nodes.push({
                name: 'Profil Commerçant',
                nodes: [
                    {
                        name: 'Mes documents',
                        nodes: [
                            {
                                name: 'Factures/Livraisons',
                                nodes: merchantDeliveryTransfers,
                            },
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
                url: await this.minioService.generateImageUrl('client-documents', doc.provider_document_url),
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
                    url: await this.minioService.generateImageUrl('client-documents', contract.contract_url),
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

        // Filter out empty nodes recursively
        const filterEmptyNodes = (nodes: any[]) => {
            return nodes
                .map(node => {
                    if (node.nodes) {
                        const filteredNodes = filterEmptyNodes(node.nodes);
                        if (filteredNodes.length > 0) {
                            return { ...node, nodes: filteredNodes };
                        }
                    } else {
                        return node;
                    }
                    return null;
                })
                .filter(node => node !== null);
        };

        return {
            name: 'Mes documents',
            nodes: filterEmptyNodes(nodes),
        };
    }
}
