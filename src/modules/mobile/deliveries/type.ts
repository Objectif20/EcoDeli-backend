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
  total_price: string;
  cart_dropped: boolean;
  deliveryPersonName: string;
  deliveryPersonPhoto: string;
  packages: {
    id: string;
    name: string;
    fragility: boolean;
    estimated_price: string;
    weight: number;
    volume: number;
    picture: string[];
  }[];
}

export interface InvoiceLineItem {
  label: string;
  value: number;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  deliveryId: string;
  shipmentDescription: string;
  deliveryCode: string;
  deliveryDate: string;
  departureCity: string;
  arrivalCity: string;
  deliveryPersonName: string;
  deliveryPersonPhone: string;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  isMainStep: boolean;
  stripeIntentId?: string | null;
}