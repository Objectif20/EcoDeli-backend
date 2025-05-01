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
  
  }

  export interface HistoryDelivery {
    id: string;
    departure_city: string;
    arrival_city: string;
    price: number;
    client: {
      name: string;
      photo_url: string;
    };
    status: string;
  }

  export interface ReviewAsDeliveryPerson {
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      photo: string;
    };
    reply: boolean;
    reply_content: string | null;
    delivery_name: string;
    rate: number;
  }