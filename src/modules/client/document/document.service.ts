import { InjectRepository } from "@nestjs/typeorm";
import { Appointments } from "src/common/entities/appointments.entity";
import { DeliveryPersonDocument } from "src/common/entities/delivery_person_documents.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Providers } from "src/common/entities/provider.entity";
import { ProviderContracts } from "src/common/entities/providers_contracts.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { Transfer } from "src/common/entities/transfers.entity";
import { TransferProvider } from "src/common/entities/transfers_provider.entity";
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
        @InjectRepository(Transfer)
        private readonly transferRepository: Repository<Transfer>,
        @InjectRepository(TransferProvider)
        private readonly transferProviderRepository: Repository<TransferProvider>,
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

                const contractDocs = deliveryDocuments.filter(doc =>
                    doc.document_url && doc.document_url.includes('/contracts/')
                );

                const justificatifDocs = deliveryDocuments.filter(doc =>
                    !doc.document_url || !doc.document_url.includes('/contracts/')
                );

                const contractNodes = await Promise.all(
                    contractDocs.map(async (doc) => {
                    const url = await this.minioService.generateImageUrl('client-documents', doc.document_url);
                    return url ? { name: doc.document_url.split('/').pop(), url } : null;
                    })
                ).then(nodes => nodes.filter(node => node !== null));

                const deliveryNodes = await Promise.all(
                    justificatifDocs.map(async (doc) => {
                    const url = await this.minioService.generateImageUrl('client-documents', doc.document_url);
                    return url ? { name: doc.document_url.split('/').pop(), url } : null;
                    })
                ).then(nodes => nodes.filter(node => node !== null));

                const vehicleList = await this.vehicleRepository.find({
                    where: { deliveryPerson: { delivery_person_id: deliveryPerson.delivery_person_id } },
                    relations: ['vehicleDocuments'],
                });

                const vehicleNodes = await Promise.all(
                    vehicleList.map(async (vehicle) => ({
                    name: vehicle.registration_number,
                    nodes: await Promise.all(
                        vehicle.vehicleDocuments.map(async (doc) => {
                        const url = await this.minioService.generateImageUrl('client-documents', doc.vehicle_document_url);
                        return url ? { name: doc.vehicle_document_url.split('/').pop(), url } : null;
                        })
                    ).then(nodes => nodes.filter(node => node !== null)),
                    }))
                );

                const transfers = await this.transferRepository.find({
                    where: { delivery_person: { delivery_person_id: deliveryPerson.delivery_person_id } },
                });

                const transferNodes = await Promise.all(
                    transfers.map(async (transfer) => {
                    const url = transfer.url ? await this.minioService.generateImageUrl('client-documents', transfer.url) : null;
                    return url && transfer.url ? { name: transfer.url.split('/').pop(), url } : null;
                    })
                ).then(nodes => nodes.filter(node => node !== null));

                const profilTransporteurNodes = [
                    { name: 'Mes justificatifs', nodes: deliveryNodes },
                    { name: 'Mes véhicules', nodes: vehicleNodes },
                    { name: 'Mes transferts', nodes: transferNodes },
                ];

                if (contractNodes.length > 0) {
                    profilTransporteurNodes.unshift({ name: 'Mon contrat', nodes: contractNodes });
                }

                nodes.push({
                    name: 'Profil Transporteur',
                    nodes: profilTransporteurNodes,
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
                        delivery.transfers.map(async transfer => {
                            const url = transfer.url ? await this.minioService.generateImageUrl('client-documents', transfer.url) : null;
                            return url && transfer.url ? { name: transfer.url.split('/').pop(), url } : null;
                        })
                    )
                )
            ).then(nodes => nodes.filter(node => node !== null));

            const appointments = await this.appointmentRepository.find({
                where: { client: { client_id: client.client_id }, status: In(['in_progress', 'completed']) },
            });

            const appointmentNodes = await Promise.all(
                appointments.map(async appointment => {
                    const url = appointment.url_file ? await this.minioService.generateImageUrl('client-documents', appointment.url_file) : null;
                    return url && appointment.url_file ? { name: appointment.url_file.split('/').pop(), url } : null;
                })
            ).then(nodes => nodes.filter(node => node !== null));

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
                delivery.transfers.map(async transfer => {
                const url = transfer.url ? await this.minioService.generateImageUrl('client-documents', transfer.url) : null;
                return url && transfer.url ? { name: transfer.url.split('/').pop(), url } : null;
                })
            )
            )
        ).then(nodes => nodes.filter(node => node !== null));

        const contractNodes = merchant.contract_url
            ? [{
                name: merchant.contract_url.split('/').pop(),
                url: await this.minioService.generateImageUrl('client-documents', merchant.contract_url),
            }]
            : [];

        const profilCommercantNodes: { name: string; nodes: any[] }[] = [];

        if (contractNodes.length > 0) {
            profilCommercantNodes.push({
            name: 'Contrats',
            nodes: contractNodes,
            });
        }

        profilCommercantNodes.push({
            name: 'Mes documents',
            nodes: [
            {
                name: 'Factures/Livraisons',
                nodes: merchantDeliveryTransfers,
            },
            ],
        });

        nodes.push({
            name: 'Profil Commerçant',
            nodes: profilCommercantNodes,
        });
        }

        if (profile.includes('PROVIDER') && provider) {
            const providerDocuments = await this.providerDocumentsRepository.find({
                where: { provider: { provider_id: provider.provider_id } }
            });

            const providerDocumentsNodes = await Promise.all(providerDocuments.map(async (doc) => {
                const url = await this.minioService.generateImageUrl('provider-documents', doc.provider_document_url);
                return url ? { name: doc.provider_document_url.split('/').pop(), url } : null;
            })).then(nodes => nodes.filter(node => node !== null));

            const providerContracts = await this.providerContractsRepository.find({
                where: { provider: { provider_id: provider.provider_id } }
            });

            const providerContractsNodes = await Promise.all(providerContracts.map(async (contract) => {
                const url = await this.minioService.generateImageUrl('provider-documents', contract.contract_url);
                return url ? { name: contract.contract_url.split('/').pop(), url } : null;
            })).then(nodes => nodes.filter(node => node !== null));

            const transfersProvider = await this.transferProviderRepository.find({
                where: { provider: { provider_id: provider.provider_id } },
            });

            const transferProviderNodes = await Promise.all(transfersProvider.map(async (transfer) => {
                const url = transfer.url ? await this.minioService.generateImageUrl('client-documents', transfer.url) : null;
                return url && transfer.url ? { name: transfer.url.split('/').pop(), url } : null;
            })).then(nodes => nodes.filter(node => node !== null));

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
                    {
                        name: 'Mes transferts',
                        nodes: transferProviderNodes,
                    },
                ],
            });
        }

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
