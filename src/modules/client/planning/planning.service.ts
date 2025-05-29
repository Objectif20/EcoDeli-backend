import { InjectRepository } from "@nestjs/typeorm";
import { Appointments } from "src/common/entities/appointments.entity";
import { Client } from "src/common/entities/client.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Providers } from "src/common/entities/provider.entity";
import { ServicesList } from "src/common/entities/services_list.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { Users } from "src/common/entities/user.entity";
import { In, Repository } from "typeorm";
import { CalendarEvent } from "./types";



export class PlanningService {

    constructor(
        @InjectRepository(Users)
        private readonly userRepository: Repository<Users>,
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,
        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
        @InjectRepository(Merchant)
        private readonly merchantRepository: Repository<Merchant>,
        @InjectRepository(Providers)
        private readonly providerRepository: Repository<Providers>,
        @InjectRepository(Appointments)
        private readonly appointmentRepo: Repository<Appointments>,
        @InjectRepository(ServicesList)
        private readonly serviceListRepository: Repository<ServicesList>,
        @InjectRepository(Delivery)
        private readonly deliveryRepository: Repository<Delivery>,
        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,
    ) {}


    async getMyPlanning(user_id: string): Promise<CalendarEvent[]> {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: ['language', 'subscriptions', 'subscriptions.plan', 'clients', 'merchant', 'deliveryPerson'],
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

      const eventTable: CalendarEvent[] = [];

      if (profile.includes('PROVIDER')) {
        const appointments = await this.appointmentRepo.find({
          where: { provider: { provider_id: provider!.provider_id } },
          relations: ['client', 'service'],
        });

        for (const appointment of appointments) {
          const start = appointment.service_date;
          const end = new Date(start.getTime() + (appointment.duration ?? 60) * 60000);
          const clientName = appointment.client
            ? `${appointment.client.first_name} ${appointment.client.last_name}`
            : 'Client non défini';

          const serviceName = `Prestation : ${appointment.service?.name}` || 'Service non défini';

          eventTable.push({
            id: `appointment-${appointment.appointment_id}`,
            title: serviceName,
            description: `Rendez-vous avec ${clientName}`,
            location: appointment.service?.city ?? 'Ville non définie',
            start,
            end,
            allDay: false,
            color: 'sky',
          });
        }
      }

      if (profile.includes('CLIENT')) {
        const appointments = await this.appointmentRepo.find({
          where: { client: { client_id: client!.client_id } },
          relations: ['service', 'provider'],
        });

        for (const appointment of appointments) {
          const start = appointment.service_date;
          const end = new Date(start.getTime() + (appointment.duration ?? 60) * 60000);
          const providerName = appointment.provider
            ? `${appointment.provider.first_name ?? ''} ${appointment.provider.last_name ?? ''}`.trim()
            : 'Fournisseur non défini';

          const serviceName = `Prestation : ${appointment.service?.name}` || 'Service non défini';

          eventTable.push({
            id: `appointment-${appointment.appointment_id}`,
            title: serviceName,
            description: `Prestation avec ${providerName}`,
            location: appointment.service?.city ?? 'Ville non définie',
            start,
            end,
            allDay: false,
            color: 'amber',
          });
        }
      }

      if (profile.includes('DELIVERYMAN')) {
        const deliveries = await this.deliveryRepository.find({
          where: {
            delivery_person: { delivery_person_id: deliveryPerson!.delivery_person_id },
            status: In(['pending', 'taken', 'finished']),
          },
          relations: ['shipment', 'shipment.user', 'shipment.user.clients', 'shipment.user.merchant'],
        });

        for (const delivery of deliveries) {
          const start = delivery.send_date;
          const end = delivery.delivery_date ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
          const shipmentUser = delivery.shipment.user;

          const userName =
            shipmentUser.clients?.[0]
              ? `${shipmentUser.clients[0].first_name} ${shipmentUser.clients[0].last_name}`
              : shipmentUser.merchant
              ? `${shipmentUser.merchant.first_name} ${shipmentUser.merchant.last_name}`
              : 'Expéditeur inconnu';

          eventTable.push({
            id: `delivery-${delivery.delivery_id}`,
            title: `Livraison pour ${userName}`,
            description: `Statut: ${delivery.status}`,
            location: 'Lieu de livraison',
            start,
            end,
            allDay: false,
            color: 'violet',
          });
        }
      }

      if (profile.includes('CLIENT') || profile.includes('MERCHANT')) {
        const shipments = await this.shipmentRepository.find({
          where: {
            user: { user_id },
          },
          relations: ['stores', 'stores.exchangePoint', 'deliveries'],
        });

        for (const shipment of shipments) {
          for (const delivery of shipment.deliveries ?? []) {
            if (!['pending', 'taken', 'finished'].includes(delivery.status)) continue;
            if (delivery.shipment_step !== 0 && delivery.shipment_step !== 1) continue;
            const shipmentName = `Préparation de la livraison : ${shipment.description}` || 'Préparation de livraison';

            const start = delivery.send_date;
            const end = delivery.delivery_date ?? new Date(start.getTime() + 60 * 60 * 1000);

            eventTable.push({
              id: `delivery-${delivery.delivery_id}`,
              title: shipmentName,
              description: `Préparez votre colis - Statut: ${delivery.status}`,
              location: 'Point de collecte',
              start,
              end,
              allDay: false,
              color: 'rose',
            });
          }
        }
      }

      return eventTable;
    }

}