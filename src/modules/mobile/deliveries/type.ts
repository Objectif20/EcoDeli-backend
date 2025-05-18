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