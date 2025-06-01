export interface WeatherData {
    city: string
    temperature: number
    condition: "sunny" | "cloudy" | "rainy" | "snowy"
    date: Date
}

export interface LastDelivery {
    delivery: {
      id: string
      from: string
      to: string
      status: string
      pickupDate: string
      estimatedDeliveryDate: string
      coordinates: {
        origin: [number, number]
        destination: [number, number]
        current: [number, number]
      }
    }
  }

export interface finishedDelivery {
    count: number
    period : string,
}

export interface Carrier {
    id: string
    name: string
    rating: number
    status: "going" | "stop" | "finished"
    avatar: string
}

export interface NumberOfDeliveries {
    month:string;
    packages: number;
}

export interface co2Saved {
    month:string;
    co2Saved: number;
}

export interface packages{
    size : string;
    packages : number;
}

export interface nextServiceAsClient {
    title: string;
    date : string;
    image : string;
}

export interface CurrentBalance {
    amount: number
    currency: string
}

export interface CompletedService {
    count : number
    period : string
}

export interface AverageRating {
    score: number
    total: number
}

export interface revenueData {
    month: string
    particuliers : number
}


export interface upcomingService {
    id : string
    client : {
        name : string
        avatar : string
        initials : string
    }
    service : string
    date : string
}

export interface nearDeliveries {
    count : number
    period : string
}

export interface clientStats {
    month : string
    merchant : number
    client : number
}

export interface PackageLocation {
    id: string
    latitude: number
    longitude: number
    label: string
}


export interface events {
    date : Date
    label : string
}

export interface NextDelivery{
    origin: string
    destination: string
    date: Date
    status?: "wait" | "take" | "going" | "finished"
    trackingNumber?: string
    carrier?: string
    weight?: string
    estimatedTime?: string
}