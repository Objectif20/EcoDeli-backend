import { SetMetadata } from '@nestjs/common';

export const CLIENT_PROFILE_KEY = 'client_profile';
export const ClientProfile = (...profiles: string[]) => SetMetadata(CLIENT_PROFILE_KEY, profiles);
