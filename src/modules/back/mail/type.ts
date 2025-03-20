export interface PaginatedMailsResponse {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    next?: {
      page: number;
      limit: number;
    };
    previous?: {
      page: number;
      limit: number;
    };
    results: Array<{
      admin_id: string;
      subject: string;
      message: string;
      date: Date;
      send: boolean;
      newsletter: boolean;
      profile: string[];
      scheduled_time?: Date;
      admin_info?: {
        full_name: string;
        photo: string | null;
      };
    }>;
  }