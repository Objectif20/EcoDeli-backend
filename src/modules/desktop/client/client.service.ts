import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Client } from "src/common/entities/client.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { Shipment } from "src/common/entities/shipment.entity";
import { Subscription } from "src/common/entities/subscription.entity";
import { Report } from "src/common/entities/report.entity";
import { AllClient, ClientDetails } from "./type";
import { Appointments } from "src/common/entities/appointments.entity";

export class ClientService {

    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,

        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,

        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,

        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,

        @InjectRepository(Appointments)
        private readonly appointmentsRepository: Repository<Appointments>,

        private readonly minioService: MinioService,
    ) {}

    async getAllClients(page: number = 1, limit: number = 10): Promise<{ data: AllClient[]; meta: { total: number; page: number; limit: number }, totalRows: number }> {
        const skip = (page - 1) * limit;
    
        const [clients, total]: [Client[], number] = await this.clientRepository.findAndCount({
            relations: ['user', 'user.subscriptions', 'user'],
            skip,
            take: limit,
        });
    
        const formattedClients: AllClient[] = await Promise.all(
            clients.map(async (client) => {
                let photoUrl: string | null = null;
    
                if (client.user?.profile_picture) {
                    const bucketName = 'client-images';
                    const imageName = client.user.profile_picture;
                    photoUrl = await this.minioService.generateImageUrl(bucketName, imageName);
                }
    
                const reportCount = await this.reportRepository.count({
                    where: { user: { user_id: client.user.user_id } }
                });
    
                const shipmentCount = await this.shipmentRepository.count({
                    where: { user: { user_id: client.user.user_id } }
                });
    
                const activeSubscription = await this.subscriptionRepository.findOne({
                    where: {
                        user: { user_id: client.user.user_id },
                        status: 'active'
                    },
                    relations: ['plan']
                });
    
                return {
                    id: client.client_id,
                    profile_picture: photoUrl || '',
                    first_name: client.first_name,
                    last_name: client.last_name,
                    email: client.user.email,
                    nbDemandeDeLivraison: shipmentCount,
                    nbSignalements: reportCount,
                    nomAbonnement: activeSubscription?.plan?.name || 'Free',
                };
            })
        );
    
        return {
            data: formattedClients,
            meta: {
                total,
                page,
                limit,
            },
            totalRows: total,
        };
    }

    async getClientDetails(clientId: string): Promise<ClientDetails> {
        const client = await this.clientRepository.findOne({
            where: { client_id: clientId },
            relations: ['user', 'user.subscriptions', 'user.deliveryPerson'],
        });

        if (!client) {
            throw new Error('Client not found');
        }

        let photoUrl: string | null = null;
        if (client.user?.profile_picture) {
            const bucketName = 'client-images';
            const imageName = client.user.profile_picture;
            photoUrl = await this.minioService.generateImageUrl(bucketName, imageName);
        }

        const reportCount = await this.reportRepository.count({
            where: { user: { user_id: client.user.user_id } },
        });

        const shipmentCount = await this.shipmentRepository.count({
            where: { user: { user_id: client.user.user_id } },
        });

        const activeSubscription = await this.subscriptionRepository.findOne({
            where: {
                user: { user_id: client.user.user_id },
                status: 'active',
            },
            relations: ['plan'],
        });

        const countServices = await this.appointmentsRepository.count({
            where: { client: { client_id: client.client_id } },
        });

        const nombreDePrestations = countServices || 0; 
        const profilTransporteur = client.user.deliveryPerson?.delivery_person_id ? true : false; 
        const idTransporteur = client.user.deliveryPerson?.delivery_person_id || undefined;



        return {
            info: {
                profile_picture: photoUrl,
                first_name: client.first_name,
                last_name: client.last_name,
                email: client.user.email,
                nbDemandeDeLivraison: shipmentCount,
                nomAbonnement: activeSubscription?.plan?.name || 'Free',
                nbSignalements: reportCount,
                nombreDePrestations,
                profilTransporteur,
                idTransporteur,
            },
        };
    }
    
}