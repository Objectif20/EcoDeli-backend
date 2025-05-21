  export interface ActiveDeliveryAsClient {
    id: string;
    arrival_city: string;
    departure_city: string;
    date_departure: string;
    date_arrival: string;
    photo: string;
    deliveryman: {
      name: string;
      photo: string;
    };
  }

  export interface DeliveryDetails {
  departure: {
    city: string;
    coordinates: [number, number];
  };
  arrival: {
    city: string;
    coordinates: [number, number];
  };
  departure_date: string;
  arrival_date: string;
  status: "pending" | "taken" | "finished" | "validated";
  total_price: number;
  cart_dropped: boolean;
  packages: {
    id: string;
    name: string;
    fragility: boolean;
    estimated_price: number;
    weight: number;
    volume: number;
    picture: string[];
  }[];
}