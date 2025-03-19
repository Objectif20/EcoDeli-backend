export interface Provider {
    id : string;
    email : string;
    name : string;
    rate : number;
    service_number: number;
    company : string;
    profile_picture ?: string | null;
    status : string;
    phone_number: string;
}


export interface ProviderDetails {
    info: {
      name: string;
      email: string;
      company: string;
      siret: string;
      address: string;
      phone: string;
      description: string;
      postal_code: string;
      city: string;
      country: string;
      validated: boolean;
      service_type: string;
      admin: {
        id: string;
        name: string;
        photo?: string | null;
      } | null;
    };
    documents: {
      id: string;
      name: string;
      description: string;
      submission_date: Date;
      url: string;
    }[];
    services: {
      id: string;
      name: string;
      description: string;
      status: string;
      price: number;
      duration_minute: number; 
      price_admin: number;
      available: boolean; 
      keywords: {
        id: string;
        keyword: string;
      }[];
      images: {
        id: string;
        url: string;
      }[];
    }[];
    contracts: {
      id: string;
      company_name: string;
      siret: string;
      address: string;
    }[];
  }
  
  
  