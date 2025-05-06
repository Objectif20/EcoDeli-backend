export interface User {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    photo: string | null;
    active: boolean;
    language: string;
    iso_code: string;
    profile: string[];
    otp?: boolean | false;
    updgradablePlan?: boolean | false;
    planName?: string;
    validateProfile?: boolean | false;
  }