export interface AdminProfile {
    admin_id: string;
    last_name: string;
    first_name: string;
    email: string;
    active: boolean;
    photo?: string | null;
    super_admin?: boolean;
    language?: string;
    iso_code?: string;
    roles: string[];
    otp?: boolean;
}