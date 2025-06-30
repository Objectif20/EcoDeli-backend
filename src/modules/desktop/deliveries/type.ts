export interface DeliveryOnGoing {

    id: string;
    from: string;
    to: string;
    status: string;
    pickupDate: string | null;
    estimatedDeliveryDate: string | null;
    coordinates: {
      origin: [number, number];
      destination: [number, number];
    };
    progress: number;
    isBox : boolean;
    price : number;
    packageCount : number;
  }

  export interface DeliveryDetails {
  departure: {
    city: string;
    address: string;
    postalCode: string;
    coordinates: [number, number];
  };
  arrival: {
    city: string;
    address: string;
    postalCode: string;
    coordinates: [number, number];
  };
  departure_date: string;
  arrival_date: string;
  status: "pending" | "taken" | "finished" | "validated";
  total_price: number;
  cart_dropped: boolean;
  isBox: boolean;
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