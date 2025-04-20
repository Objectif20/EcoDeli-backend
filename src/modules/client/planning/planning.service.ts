import { InjectRepository } from "@nestjs/typeorm";
import { Appointments } from "src/common/entities/appointments.entity";
import { Client } from "src/common/entities/client.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Providers } from "src/common/entities/provider.entity";
import { ServicesList } from "src/common/entities/services_list.entity";
import { Users } from "src/common/entities/user.entity";
import { Repository } from "typeorm";



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
    ) {}


    async getMyPlanning(user_id: string): Promise<CalendarEvent[]> {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: ['language', 'subscriptions', 'subscriptions.plan'],
      });
    
      if (!user) {
        throw new Error('User not found');
      }
    
      const [client, deliverymanCount, merchant, provider] = await Promise.all([
        this.clientRepository.findOne({ where: { user: { user_id } } }),
        this.deliveryPersonRepository.count({ where: { user: { user_id } } }),
        this.merchantRepository.findOne({ where: { user: { user_id } } }),
        this.providerRepository.findOne({ where: { user: { user_id } } }),
      ]);
    
      const profile: string[] = [];
      if (client) profile.push('CLIENT');
      if (merchant) profile.push('MERCHANT');
      if (provider) profile.push('PROVIDER');
      if (deliverymanCount > 0) profile.push('DELIVERYMAN');
    
      const eventTable: CalendarEvent[] = [];
    
      if (profile.includes('PROVIDER') && provider) {
        const appointments = await this.appointmentRepo.find({
          where: { provider: { provider_id: provider.provider_id } },
          relations: ['client', 'service'],
        });
    
        for (const appointment of appointments) {
          const startDate = appointment.service_date;
          const durationInMinutes = appointment.duration ?? 60;
          const endDate = new Date(startDate.getTime() + durationInMinutes * 60000);
    
          const serviceName = appointment.service?.name ?? 'Service non défini';
          const serviceCity = appointment.service?.city ?? 'Ville non définie';
          const clientName = appointment.client
            ? `${appointment.client.first_name} ${appointment.client.last_name}`
            : 'Client non défini';
    
          eventTable.push({
            id: `appointment-${appointment.appointment_id}`,
            title: serviceName,
            description: `Rendez-vous avec ${clientName}`,
            location: serviceCity,
            start: startDate,
            end: endDate,
            allDay: false,
          });
        }
      } else {
        const defaultEvent: CalendarEvent = {
          id: 'event-1',
          title: '',
          description: '',
          location: '',
          start: new Date(),
          end: new Date(Date.now() + 2 * 60 * 60 * 1000),
          allDay: false,
        };
    
        if (profile.includes('MERCHANT')) {
          Object.assign(defaultEvent, {
            title: 'Merchant Special Event',
            description: 'Événement exclusif pour les commerçants.',
            location: 'Magasin principal',
          });
        } else if (profile.includes('DELIVERYMAN')) {
          Object.assign(defaultEvent, {
            title: 'Delivery Shift',
            description: 'Plage horaire de livraison.',
            location: 'Entrepôt de livraison',
          });
        } else {
          Object.assign(defaultEvent, {
            title: 'Client Appointment',
            description: 'Rendez-vous pour les clients.',
            location: 'Bureau de service client',
          });
        }
    
        eventTable.push(defaultEvent);
      }
    
      return eventTable;
    }
}