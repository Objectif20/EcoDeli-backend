import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RegisterModule } from './register/register.module';
import { TutorialModule } from './tutoriel/tuto.module';
import { ThemeModule } from './theme/theme.module';
import { LanguageModule } from './langue/langue.module';
import { ServiceModule } from './services/service.module';
import { DeliveryModule } from './delivery/delivery.module';
import { UtilsModule } from './utils/utils.module';

@Module({
    imports: [
        AuthModule,
        RegisterModule,
        TutorialModule,
        ThemeModule,
        LanguageModule,
        ServiceModule,
        DeliveryModule,
        UtilsModule
    ],
    providers: [],
})
export class ClientModule {}
