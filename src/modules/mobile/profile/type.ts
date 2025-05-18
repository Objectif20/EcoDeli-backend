export interface ProfileClient {
        user_id: string,
        first_name :  string,
        last_name : string,
        email: string,
        photo: string | null,
        active: boolean,
        profile : string[],
        otp: boolean,
        upgradablePlan : boolean | null,
        validateProfile : boolean,
        planName : string | null,
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    location?: string;
  }