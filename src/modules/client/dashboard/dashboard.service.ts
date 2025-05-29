import { Between, In, LessThanOrEqual, MoreThan, MoreThanOrEqual, Repository } from "typeorm";
import { AverageRating, Carrier, clientStats, co2Saved, CompletedService, CurrentBalance, events, finishedDelivery, LastDelivery, nearDeliveries, NextDelivery, nextServiceAsClient, NumberOfDeliveries, PackageLocation, packages, revenueData, upcomingService, WeatherData } from "./type";
import { InjectRepository } from "@nestjs/typeorm";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import axios from "axios";
import { Users } from "src/common/entities/user.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Providers } from "src/common/entities/provider.entity";
import { Inject } from "@nestjs/common";
import { Client } from "minio";
import { Appointments } from "src/common/entities/appointments.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { TransferProvider } from "src/common/entities/transfers_provider.entity";

export class DashboardService {

  constructor(
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Providers)
    private readonly providersRepository: Repository<Providers>,
    @InjectRepository(TransferProvider)
    private readonly transferProviderRepository: Repository<TransferProvider>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Appointments)
    private readonly appointmentRepository: Repository<Appointments>,
    private readonly minioService : MinioService
  ){}

    async getWeather(user_id: string): Promise<WeatherData> {

        const user = await this.userRepository.findOne({
            where: { user_id },
            relations: ['deliveryPerson', 'merchant', 'providers'],
        });

        if (!user) {
            throw new Error("User not found");
        }

        let city: string | null = null;

        if (user.deliveryPerson?.city) {
            city = user.deliveryPerson.city;
        } else if (user.merchant?.city) {
            city = user.merchant.city;
        } else if (user.providers?.length && user.providers[0].city) {
            city = user.providers[0].city;
        }

        if (!city) {
            return {
              city : "Paris",
              temperature: 0,
              condition: "sunny",
              date: new Date()
            };
        }

        try {
            const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
            const data = response.data;

            const current = data.current_condition?.[0];

            return {
                city,
                temperature: parseFloat(current.temp_C),
                condition: current.weatherDesc?.[0]?.value || "Unknown",
                date: new Date()
            };
        } catch (error) {
            console.error("Weather API error:", error);
            return {
              city : "Paris",
              temperature: 0,
              condition: "sunny",
              date: new Date()
            };
        }
    }


    async getLastShipment(user_id: string): Promise<LastDelivery> {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: ['shipments']
      });

      if (!user || !user.shipments?.length) {
        throw new Error('Aucun envoi trouvé pour cet utilisateur.');
      }

      const closestShipment = await this.shipmentRepository.findOne({
        where: {
          user: { user_id },
        },
        order: {
          deadline_date: 'ASC',
        },
        relations: ['stores', 'stores.exchangePoint'],
      });

      if (!closestShipment) {
        throw new Error('Aucune livraison trouvée.');
      }

      const origin: [number, number] = closestShipment.departure_location?.coordinates?.slice().reverse() ?? [0, 0];
      const destination: [number, number] = closestShipment.arrival_location?.coordinates?.slice().reverse() ?? [0, 0];

      return {
        delivery: {
          id: closestShipment.shipment_id,
          from: closestShipment.departure_city || 'Inconnu',
          to: closestShipment.arrival_city || 'Inconnu',
          status: closestShipment.status || 'En attente',
          pickupDate: closestShipment.deadline_date?.toISOString().split('T')[0] || '',
          estimatedDeliveryDate: closestShipment.deadline_date?.toISOString().split('T')[0] || '',
          coordinates: {
            origin,
            destination,
            current: origin,
          }
        }
      };
    }

    async getFinishedDelivery(user_id: string): Promise<finishedDelivery> {
        const now = new Date();
        const year = now.getFullYear();

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year + 1, 0, 1);

        const count = await this.shipmentRepository.count({
            where: {
                user: { user_id },
                status: 'validated',
                deadline_date: Between(startOfYear, endOfYear),
            },
        });

        return {
            count,
            period: year.toString(),
        };
    }

    async getMyCarrier(user_id : string) : Promise<Carrier[]> {
        return [
            {
              id: "1",
              name: "Nathalie P.",
              rating: 5,
              status: "going",
              avatar: "/placeholder.svg?height=40&width=40",
            },
            {
              id: "2",
              name: "Rémy T.",
              rating: 3,
              status: "stop",
              avatar: "/placeholder.svg?height=40&width=40",
            },
            {
              id: "3",
              name: "Quentin D.",
              rating: 4,
              status: "finished",
              avatar: "/placeholder.svg?height=40&width=40",
            },
        ];
    }

    async getNumberOfDeliveries(user_id: string): Promise<{ month: string; packages: number }[]> {

      const now = new Date();
      const deliveriesPerMonth: { month: string; packages: number }[] = [];

      for (let i = 11; i >= 0; i--) {
        const start = startOfMonth(subMonths(now, i));
        const end = endOfMonth(subMonths(now, i));

        const count = await this.shipmentRepository.count({
          where: {
            user: { user_id },
            deadline_date: Between(start, end),
          },
        });

        if (count > 0) {
          const monthName = start.toLocaleString('default', { month: 'short' });

          deliveriesPerMonth.push({
            month: monthName,
            packages: count,
          });
        }
      }

      return deliveriesPerMonth;
    }

    async getCo2Saved(user_id: string): Promise<co2Saved[]> {
        const now = new Date();
        const year = now.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year + 1, 0, 1);

        const shipments = await this.shipmentRepository.find({
            where: {
                user: { user_id },
                status: 'validated',
                deadline_date: Between(startOfYear, endOfYear),
            },
        });

        const monthsMap: Record<string, number> = {
            Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
            Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
        };

        for (const shipment of shipments) {
            if (!shipment.departure_location || !shipment.arrival_location) continue;

            const distanceMeters = getDistance(
                {
                    latitude: shipment.departure_location.coordinates[1],
                    longitude: shipment.departure_location.coordinates[0],
                },
                {
                    latitude: shipment.arrival_location.coordinates[1],
                    longitude: shipment.arrival_location.coordinates[0],
                }
            );

            const reducedDistanceKm = (distanceMeters / 1000) * 0.8;
            const co2Kg = reducedDistanceKm * 0.11; 

            const shipmentMonth = shipment.deadline_date!.toLocaleString('en-US', { month: 'short' });
            if (monthsMap[shipmentMonth] !== undefined) {
                monthsMap[shipmentMonth] += co2Kg;
            }
        }

        const result: co2Saved[] = Object.entries(monthsMap).map(([month, co2Saved]) => ({
            month,
            co2Saved: parseFloat(co2Saved.toFixed(2)), 
        }));

        return result;
    }

    async getPackages(user_id: string): Promise<{ size: string; packages: number }[]> {

      const shipments = await this.shipmentRepository.find({
        where: { user: { user_id }, }, 
        relations: ['parcels'],
      });

      const sizeCounts: Record<string, number> = {
        S: 0,
        M: 0,
        L: 0,
        XL: 0,
        XXL: 0,
      };

      shipments.forEach(shipment => {
        shipment.parcels.forEach(parcel => {
          const weight = parcel.weight ?? 0;

          if (weight < 5) sizeCounts.S += 1;
          else if (weight <= 30) sizeCounts.M += 1;
          else if (weight <= 50) sizeCounts.L += 1;
          else if (weight <= 100) sizeCounts.XL += 1;
          else sizeCounts.XXL += 1;
        });
      });

      return Object.entries(sizeCounts)
        .filter(([_, count]) => count > 0)
        .map(([size, count]) => ({ size, packages: count }));
    }

    async getNextServiceAsClient(user_id: string): Promise<nextServiceAsClient> {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: ['clients'],
      });

      const client = user?.clients?.[0] ?? null;

      if (!client) {
        console.log("Aucun client trouvé pour l'utilisateur", user_id);
        return {
          title: "Promenade de votre chien",
          date: "Sam 12 janvier 2025, 14h30",
          image: "https://www.ennaturesimone.com/wp-content/uploads/2020/08/randonnee-fontainebleau.jpg",
        };
      }

      const now = new Date();

      const nextAppointment = await this.appointmentRepository.findOne({
        where: {
          client: { client_id: client.client_id },
          service_date: MoreThan(now),
        },
        order: { service_date: 'ASC' },
        relations: ['service', 'service.images'],
      });

      if (nextAppointment) {
        const imageKey = nextAppointment.service?.images?.[0]?.image_service_url;
        const firstImageUrl = imageKey
          ? await this.minioService.generateImageUrl('provider-images', imageKey)
          : "https://www.ennaturesimone.com/wp-content/uploads/2020/08/randonnee-fontainebleau.jpg";

        return {
          title: `Prestation : ${nextAppointment.service?.name ?? "Service non défini"}`,
          date: nextAppointment.service_date.toLocaleString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          image: firstImageUrl,
        };
      }

      const lastPastAppointment = await this.appointmentRepository.findOne({
        where: {
          client: { client_id: client.client_id },
          service_date: LessThanOrEqual(now),
        },
        order: { service_date: 'DESC' },
        relations: ['service', 'service.images'],
      });

      if (lastPastAppointment) {
        const imageKey = lastPastAppointment.service?.images?.[0]?.image_service_url;
        const firstImageUrl = imageKey
          ? await this.minioService.generateImageUrl('provider-images', imageKey)
          : "https://www.ennaturesimone.com/wp-content/uploads/2020/08/randonnee-fontainebleau.jpg";

        return {
          title: `Prestation : ${lastPastAppointment.service?.name ?? "Service non défini"}`,
          date: lastPastAppointment.service_date.toLocaleString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          image: firstImageUrl,
        };
      }

      const shipments = await this.shipmentRepository.find({
        where: { user: { user_id } },
        relations: ['deliveries'],
      });

      let futureDeliveries: Delivery[] = [];
      let pastDeliveries: Delivery[] = [];

      shipments.forEach(shipment => {
        shipment.deliveries?.forEach(delivery => {
          if (delivery.send_date > now && ['pending', 'taken', 'finished'].includes(delivery.status)) {
            futureDeliveries.push(delivery);
          } else if (delivery.send_date <= now && ['pending', 'taken', 'finished'].includes(delivery.status)) {
            pastDeliveries.push(delivery);
          }
        });
      });

      futureDeliveries.sort((a, b) => a.send_date.getTime() - b.send_date.getTime());
      pastDeliveries.sort((a, b) => b.send_date.getTime() - a.send_date.getTime());

      if (futureDeliveries.length > 0) {
        const d = futureDeliveries[0];
        return {
          title: `Livraison prévue`,
          date: d.send_date.toLocaleString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          image: "https://www.ennaturesimone.com/wp-content/uploads/2020/08/randonnee-fontainebleau.jpg",
        };
      }

      if (pastDeliveries.length > 0) {
        const d = pastDeliveries[0];
        return {
          title: `Dernière livraison`,
          date: d.send_date.toLocaleString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          image: "https://www.ennaturesimone.com/wp-content/uploads/2020/08/randonnee-fontainebleau.jpg",
        };
      }

      return {
        title: "Promenade de votre chien",
        date: "Sam 12 janvier 2025, 14h30",
        image: "https://www.ennaturesimone.com/wp-content/uploads/2020/08/randonnee-fontainebleau.jpg",
      };
    }

    async getCurrentBalance(user_id: string): Promise<{ amount: number; currency: string }> {

      const deliveryPerson = await this.deliveryPersonRepository.findOne({
        where: { user: { user_id } },
      });

      if (deliveryPerson) {
        return {
          amount: Number(deliveryPerson.balance), 
          currency: "€",
        };
      }

      const provider = await this.providersRepository.findOne({
        where: { user: { user_id } },
      });

      if (provider) {
        return {
          amount: Number(provider.balance),
          currency: "€",
        };
      }

      return {
        amount: 0,
        currency: "€",
      };
    }

    async getCompletedService(user_id: string): Promise<CompletedService> {

      const provider = await this.providersRepository.findOne({
        where: { user: { user_id } },
      });

      if (!provider) {
        throw new Error("Provider non trouvé pour cet utilisateur.");
      }

      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1); 
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59); 

      const count = await this.appointmentRepository.count({
        where: {
          provider: { provider_id: provider.provider_id },
          service_date: Between(startOfYear, endOfYear),
        },
      });

      const mois = now.toLocaleString('fr-FR', { month: 'long' });
      const capitalizedMois = mois.charAt(0).toUpperCase() + mois.slice(1);

      return {
        count,
        period: capitalizedMois,
      };
    }

    async getAverageRating(user_id: string): Promise<AverageRating> {

      const provider = await this.providersRepository.findOne({
        where: { user: { user_id } },
      });

      if (!provider) {
        throw new Error("Provider non trouvé.");
      }

      const finishedAppointments = await this.appointmentRepository.find({
        where: {
          provider: { provider_id: provider.provider_id },
          status: 'finished',
        },
        relations: ['review_presta'],
      });

      const ratings = finishedAppointments
        .map(app => app.review_presta?.rating)
        .filter((rating): rating is number => typeof rating === 'number');

      const total = ratings.length;

      if (total === 0) {
        return {
          score: 0,
          total: 0,
        };
      }

      const sum = ratings.reduce((acc, curr) => acc + curr, 0);
      const average = parseFloat((sum / total).toFixed(2));

      return {
        score: average,
        total,
      };
    }

    async getRevenueData(user_id: string): Promise<revenueData[]> {
      const provider = await this.providersRepository.findOne({
        where: { user: { user_id } },
      });

      if (!provider) throw new Error("Provider not found");

      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const transfers = await this.transferProviderRepository.find({
        where: {
          provider: { provider_id: provider.provider_id },
          date: MoreThanOrEqual(oneYearAgo),
        },
      });

      const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
      ];

      const monthMap: { [key: string]: number } = {};

      for (const transfer of transfers) {
        const date = new Date(transfer.date);
        const monthLabel = monthNames[date.getMonth()];
        if (!monthMap[monthLabel]) {
          monthMap[monthLabel] = 0;
        }
        monthMap[monthLabel] += Number(transfer.amount);
      }

      const result: revenueData[] = [];

      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const monthLabel = monthNames[date.getMonth()];
        const amount = monthMap[monthLabel];
        if (amount !== undefined) {
          result.push({ month: monthLabel, particuliers: amount });
        }
      }

      const currentMonthName = monthNames[now.getMonth()];
      if (!result.find(item => item.month === currentMonthName)) {
        result.push({
          month: `${currentMonthName} (en cours)`,
          particuliers: 0,
        });
      }

      return result;
    }

    async getUpcomingServices(user_id: string): Promise<upcomingService[]> {
      const provider = await this.providersRepository.findOne({
        where: { user: { user_id } },
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      const now = new Date();

      const appointments = await this.appointmentRepository.find({
        where: {
          provider: { provider_id: provider.provider_id },
          service_date: MoreThan(now),
        },
        relations: ['client', 'service', 'client.user'],
        order: { service_date: 'ASC' },
        take: 7,
      });

      const upcoming: upcomingService[] = [];

      for (const appointment of appointments) {
        const client = appointment.client;
        const service = appointment.service;

        if (!client || !service) continue;

        const initials = `${client.first_name?.[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase();
        const clientName = `${client.first_name} ${client.last_name ?? ''}`;

        upcoming.push({
          id: appointment.appointment_id,
          client: {
            name: clientName,
            avatar: client.user.profile_picture
              ? await this.minioService.generateImageUrl('client-images', client.user.profile_picture)
              : "/placeholder.svg?height=40&width=40",
            initials,
          },
          service: service.name,
          date: appointment.service_date.toLocaleDateString('fr-FR'),
        });
      }

      return upcoming;
    }

    async getNearDeliveries(user_id : string) : Promise<nearDeliveries> {

        return {
            count: 5,
            period: "Mars",
        }
    }

    async getClientStats(user_id : string) : Promise<clientStats[]> {
        console.log("getClientStats", user_id);

        return  [{ month: "january", merchant: 1260, client: 570 }]
    }

    async getPackageLocation(user_id: string): Promise<PackageLocation[]> {
        console.log("getPackageLocation", user_id)
      
        const baseLat = 48.8566
        const baseLon = 2.3522
      
        const locations: PackageLocation[] = Array.from({ length: 15 }).map((_, index) => {
          const latOffset = (Math.random() - 0.5) * 0.1 
          const lonOffset = (Math.random() - 0.5) * 0.1
          return {
            id: `pkg-${index + 1}`,
            latitude: baseLat + latOffset,
            longitude: baseLon + lonOffset,
            label: `Colis #${index + 1} - Paris`,
          }
        })
      
        return locations
    }

    async getMyNextEvent(user_id: string): Promise<events[]> {      
        const now = new Date()
      
        const events: events[] = [
          {
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
            label: "Livraison prévue - Colis Express",
          },
          {
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
            label: "Retrait en point relais",
          },
          {
            date: new Date(now.getFullYear(), now.getMonth() + 1, 1),
            label: "Nouvelle commande programmée",
          },
        ]
      
        return Promise.resolve(events)
    }

    async getNextDelivery(user_id : string) : Promise<NextDelivery> {
        return {
            origin :  "Paris",
            destination:"Marseille",
            date : new Date(),
            status : "take",
            trackingNumber : "FR7589214563",
            carrier : "Chronopost",
            weight : "3.5 kg",
            estimatedTime : "2 jours",
        }
    }

    async getCompletedDeliveries(user_id : string) : Promise<CompletedService> {
      return {
          count: 10,
          period: "Mars",
      }
    }
}


function getDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371000; 
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);
  const deltaLat = toRad(point2.latitude - point1.latitude);
  const deltaLon = toRad(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return distance; 
}