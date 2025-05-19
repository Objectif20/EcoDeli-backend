export interface ShipmentDetails {
    details: {
      id: string;
      name: string;
      description: string;
      complementary_info: string;
      facture_url : string;
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
      status: string;
      initial_price: number;
      price_with_step: {
        step: string;
        price: number;
      }[];
      invoice: {
        name: string;
        url_invoice: string;
      }[];
      urgent: boolean;
      finished: boolean;
      trolleydrop: boolean;
    };
    package: {
      id: string;
      picture: string[];
      name: string;
      fragility: boolean;
      estimated_price: number;
      weight: number;
      volume: number;
    }[];
    steps: {
      id: number;
      title: string;
      description: string;
      date: string;
      departure: {
        city: string;
        coordinates: [number, number];
      };
      arrival: {
        city: string;
        coordinates: [number, number];
      };
      courier: {
        name: string;
        photoUrl: string;
      };
      idLink: string;
    }[];
}

export interface ShipmentListItem {
    id: string;
    name: string;
    status: string;
    urgent: boolean;
    departure: {
        city: string;
    };
    arrival: {
        city: string;
    };
    arrival_date: string;
    packageCount: number;
    progress: number;
    finished: boolean;
    initial_price: number;
}