export interface serviceHistory {
    id : string;
    id_service: string;
    price: number;
    provider: {
        id: string;
        name: string;
        photo: string | null;
    };
    date: string;
    service_name: string;
    rate: number | null;
    review: string | null;
    finished: boolean;
}

export interface ServiceDetails {
  service_id: string;
  service_type: string;
  status: string;
  name: string;
  city: string;
  price: number;
  price_admin: number;
  duration_time: number;
  available: boolean;
  keywords: string[];
  images: string[];
  description: string;
  author: {
    id: string;
    name: string;
    email: string;
    photo: string | null;
  } | null;
}