export interface MyServicesResponse {
  data: MyService[];
  total: number;
  page: number;
  limit: number;
}

export interface MyService {
  id: string;
  name: string;
  description: string;
  type: string;
  city: string;
  price: number;
  duration: number;
  available: boolean;
  status: string;
  validated: boolean;
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
  rate: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    photo: string | null;
  };
  content: string;
  response?: {
    id: string;
    author: {
      id: string;
      name: string;
      photo: string | null;
    };
    content: string;
  };
}