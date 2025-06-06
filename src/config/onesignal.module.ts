import { Module, Global } from '@nestjs/common';
import { SecretsModule } from './secrets.module';
import { OneSignalConfigService } from './onesignal.config';

@Global()
@Module({
  imports: [SecretsModule],
  providers: [
    OneSignalConfigService,
    {
      provide: 'ONESIGNAL_WEB_CLIENT',
      useFactory: async (config: OneSignalConfigService) => config.getWebClient(),
      inject: [OneSignalConfigService],
    },
    {
      provide: 'ONESIGNAL_MOBILE_CLIENT',
      useFactory: async (config: OneSignalConfigService) => config.getMobileClient(),
      inject: [OneSignalConfigService],
    },
  ],
  exports: ['ONESIGNAL_WEB_CLIENT', 'ONESIGNAL_MOBILE_CLIENT'],
})
export class OneSignalModule {}
