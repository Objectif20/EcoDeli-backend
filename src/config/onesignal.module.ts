import { Module, Global } from '@nestjs/common';
import { SecretsModule } from './secrets.module'; 
import { OneSignalConfigService } from './onesignal.config';

@Global()
@Module({
  imports: [SecretsModule],  
  providers: [
    OneSignalConfigService,  
    {
      provide: 'ONESIGNAL_CLIENT',
      useFactory: async (oneSignalConfigService: OneSignalConfigService) => {
        return oneSignalConfigService.getClient();
      },
      inject: [OneSignalConfigService], 
    },
  ],
  exports: ['ONESIGNAL_CLIENT'],  
})
export class OneSignalModule {}
