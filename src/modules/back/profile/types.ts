export interface AdminProfile {
    admin_id: string;
    last_name: string;
    first_name: string;
    email: string;
    active: boolean;
    photo?: string | null;
    roles: string[];
}