import { Between, In, MoreThanOrEqual, Repository } from "typeorm";
import { AverageRating, Carrier, clientStats, co2Saved, CompletedService, CurrentBalance, events, finishedDelivery, LastDelivery, nearDeliveries, NextDelivery, nextServiceAsClient, NumberOfDeliveries, PackageLocation, packages, revenueData, upcomingService, WeatherData } from "./type";
import { InjectRepository } from "@nestjs/typeorm";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import axios from "axios";
import { Users } from "src/common/entities/user.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

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
        console.log("getMyCarrier", user_id);
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

          // Init CO2 per month
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
              const co2Kg = reducedDistanceKm * 0.11; // 110g/km => 0.11kg/km

              const shipmentMonth = shipment.deadline_date!.toLocaleString('en-US', { month: 'short' });
              if (monthsMap[shipmentMonth] !== undefined) {
                  monthsMap[shipmentMonth] += co2Kg;
              }
          }

          // Format final result
          const result: co2Saved[] = Object.entries(monthsMap).map(([month, co2Saved]) => ({
              month,
              co2Saved: parseFloat(co2Saved.toFixed(2)), // optional rounding
          }));

          return result;
      }

    async getPackages(user_id : string) : Promise<packages[]> {
        console.log("getPackages", user_id);
        return [
            { size: "S", packages: 10 },
            { size: "M", packages: 20 },
            { size: "L", packages: 30 },
        ];
    }

    async getNextServiceAsClient(user_id : string) : Promise<nextServiceAsClient> {
        console.log("getNextServiceAsClient", user_id);
        return {
            title: "Promenade de votre chien",
            date: "Sam 12 janvier 2025, 14h30",
            image: "https://letsenhance.io/static/73136da51c245e80edc6ccfe44888a99/1015f/MainBefore.jpg",
          }
    }

    async getCurrentBalance(user_id : string) : Promise<CurrentBalance> {
        console.log("getCurrentBalance", user_id);
        return {
            amount: 100,
            currency: "€",
        }
    }

    async getCompletedService(user_id : string) : Promise<CompletedService> {
        console.log("getCompletedService", user_id);
        return {
            count: 10,
            period: "Mars",
        }
    }

    async getAverageRating(user_id : string) : Promise<AverageRating> {
        console.log("getAverageRating", user_id);
        return {
            score: 4.5,
            total: 5,
        }
    }

    async getRevenueData(user_id : string) : Promise<revenueData[]> {
        console.log("getRevenueData", user_id);
        return [
            { month: "Jan", particuliers: 100 },
            { month: "Feb", particuliers: 200 },
            { month: "Mar", particuliers: 300 },
            { month: "Apr", particuliers: 400 },
            { month: "May", particuliers: 500 },
            { month: "Jun", particuliers: 600 },
            { month: "Jul", particuliers: 700 },
            { month: "Aug", particuliers: 800 },
            { month: "Sep", particuliers: 900 },
            { month: "Oct", particuliers: 1000 },
            { month: "Nov", particuliers: 1100 },
            { month: "Dec", particuliers: 1200 },
        ];
    }

    async getUpcomingServices(user_id : string) : Promise<upcomingService[]> {

        console.log("getUpcomingServices", user_id);
        return [
            {
              id: "1",
              client: {
                name: "Nathalie P.",
                avatar: "/placeholder.svg?height=40&width=40",
                initials: "NP",
              },
              service: "Promenade de votre chien",
              date: "12/03/2025",
            },
            {
              id: "2",
              client: {
                name: "Thomas R.",
                avatar: "/placeholder.svg?height=40&width=40",
                initials: "TR",
              },
              service: "Livraison de colis",
              date: "14/03/2025",
            },
            {
              id: "3",
              client: {
                name: "Sophie M.",
                avatar: "/placeholder.svg?height=40&width=40",
                initials: "SM",
              },
              service: "Courses alimentaires",
              date: "15/03/2025",
            },
            {
              id: "4",
              client: {
                name: "Jean D.",
                avatar: "/placeholder.svg?height=40&width=40",
                initials: "JD",
              },
              service: "Promenade de votre chien",
              date: "18/03/2025",
            },
            {
              id: "5",
              client: {
                name: "Marie L.",
                avatar: "/placeholder.svg?height=40&width=40",
                initials: "ML",
              },
              service: "Livraison de repas",
              date: "20/03/2025",
            },
          ]
    }

    async getNearDeliveries(user_id : string) : Promise<nearDeliveries> {

        console.log("getNearDeliveries", user_id);
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
        console.log("getMyNextEvent", user_id)
      
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
        console.log("getNextDelivery", user_id);
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

      console.log("getCompletedDeliveries", user_id);
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