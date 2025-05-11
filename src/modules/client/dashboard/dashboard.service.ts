import { AverageRating, Carrier, clientStats, co2Saved, CompletedService, CurrentBalance, events, finishedDelivery, LastDelivery, nearDeliveries, NextDelivery, nextServiceAsClient, NumberOfDeliveries, PackageLocation, packages, revenueData, upcomingService, WeatherData } from "./type";

export class DashboardService {

    async getWeather(user_id : string) : Promise<WeatherData> {
        console.log("getWeather", user_id);
        return {
            city: "Paris",
            temperature: 13,
            condition: "sunny",
            date: new Date(),
        }
    }

    async getLastDelivery(user_id : string) : Promise<LastDelivery> {
        console.log("getLastDelivery", user_id);
        return {
            delivery: {
                id: "123456",
                from: "Paris",
                to: "Lyon",
                status: "delivered",
                pickupDate: new Date().toString(),
                estimatedDeliveryDate: new Date().toString(),
                coordinates: {
                    origin: [48.8566, 2.3522],
                    destination: [45.7640, 4.8357],
                    current: [48.8566, 2.3522],
                }
            }
        }
    }

    async getFinishedDelivery(user_id : string) : Promise<finishedDelivery> {
        console.log("getFinishedDelivery", user_id);
        return {
            count: 10,
            period: "Mars",
        }
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

    async getNumberOfDeliveries(user_id : string) : Promise<NumberOfDeliveries[]> {
        console.log("getNumberOfDeliveries", user_id);
        return [
            { month: "Jan", packages: 10 },
            { month: "Feb", packages: 20 },
            { month: "Mar", packages: 30 },
            { month: "Apr", packages: 40 },
            { month: "May", packages: 50 },
            { month: "Jun", packages: 60 },
            { month: "Jul", packages: 70 },
            { month: "Aug", packages: 80 },
            { month: "Sep", packages: 90 },
            { month: "Oct", packages: 100 },
            { month: "Nov", packages: 110 },
            { month: "Dec", packages: 120 },
        ];
    }

    async getCo2Saved(user_id : string) : Promise<co2Saved[]> {
        console.log("getCo2Saved", user_id);
        return [
            { month: "Jan", co2Saved: 10 },
            { month: "Feb", co2Saved: 20 },
            { month: "Mar", co2Saved: 30 },
            { month: "Apr", co2Saved: 40 },
            { month: "May", co2Saved: 50 },
            { month: "Jun", co2Saved: 60 },
            { month: "Jul", co2Saved: 70 },
            { month: "Aug", co2Saved: 80 },
            { month: "Sep", co2Saved: 90 },
            { month: "Oct", co2Saved: 100 },
            { month: "Nov", co2Saved: 110 },
            { month: "Dec", co2Saved: 120 },
        ];
    }

    async getPackages(user_id : string) : Promise<packages[]> {
        console.log("getPackages", user_id);
        return [
            { size: "small", packages: 10 },
            { size: "medium", packages: 20 },
            { size: "large", packages: 30 },
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
            date : new Date(2025, 1, 12, 14, 30),
            status : "take",
            trackingNumber : "FR7589214563",
            carrier : "Chronopost",
            weight : "3.5 kg",
            estimatedTime : "2 jours",
        }
    }

}