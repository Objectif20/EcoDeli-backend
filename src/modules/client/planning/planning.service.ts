import { InjectRepository } from "@nestjs/typeorm";
import { Client } from "src/common/entities/client.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Providers } from "src/common/entities/provider.entity";
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
    ) {}


    async getMyPlanning(user_id: string): Promise<CalendarEvent[]> {
        const user = await this.userRepository.findOne({
          where: { user_id },
          relations: ['language', 'subscriptions', 'subscriptions.plan'],
        });
    
        if (!user) {
          throw new Error('User not found');
        }
    
        const client = await this.clientRepository.findOne({ where: { user: { user_id } } });
        const deliverymanExists = await this.deliveryPersonRepository.count({ where: { user: { user_id } } });
        const merchant = await this.merchantRepository.findOne({ where: { user: { user_id } } });
        const provider = await this.providerRepository.findOne({ where: { user: { user_id } } });
    
        let profile: string[] = [];
        if (client) profile.push('CLIENT');
        if (merchant) profile.push('MERCHANT');
        if (provider) profile.push('PROVIDER');
        if (deliverymanExists > 0) profile.push('DELIVERYMAN');
    
        let event: CalendarEvent = {
          id: 'event-1', 
          title: 'Generic Event',
          start: new Date(), 
          end: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), 
          allDay: false,
        };
    
        if (profile.includes('MERCHANT')) {
          event.title = 'Merchant Special Event';
          event.description = 'Événement exclusif pour les commerçants.';
          event.location = 'Magasin principal';
        } else if (profile.includes('PROVIDER')) {
          event.title = 'Provider Meeting';
          event.description = 'Réunion pour les prestataires.';
          event.location = 'Bureau de gestion des prestataires';
        } else if (profile.includes('DELIVERYMAN')) {
          event.title = 'Delivery Shift';
          event.description = 'Plage horaire de livraison.';
          event.location = 'Entrepôt de livraison';
        } else {
          event.title = 'Client Appointment';
          event.description = 'Rendez-vous pour les clients.';
          event.location = 'Bureau de service client';
        }
    
        const eventTable = [event];
  
        return eventTable;
      }
}