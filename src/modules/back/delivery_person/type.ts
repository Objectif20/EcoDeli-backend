export interface AllDeliveryPerson {
    id : string;
    profile_picture : string;
    first_name : string;
    last_name : string;
    status : boolean;
    email : string;
    rate : number;
}

export interface DeliverymanDetails {
    info: {
      profile_picture: string | null
      first_name: string
      last_name: string
      validated: boolean | null
      description: string
      email: string
      phone: string
      document?: string
    },
    vehicles: Vehicle[]
  }
  
  export  interface Vehicle {
    id: string
    name: string
    matricule: string
    co2: number
    allow: boolean
    image: string
    justification_file: string
  }
  
  export interface Route {
    id: string
    from: string
    to: string
    permanent: boolean
    coordinates: {
      origin: [number, number]
      destination: [number, number]
    }
    date?: string
    weekday?: string
    tolerate_radius: number
    comeback_today_or_tomorrow: "today" | "tomorrow" | "later"
  }