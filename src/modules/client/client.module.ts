import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RegisterModule } from './register/register.module';
import { TutorialModule } from './tutoriel/tuto.module';
import { ThemeModule } from './theme/theme.module';
import { LanguageModule } from './langue/langue.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
    imports: [
        AuthModule,
        RegisterModule,
        TutorialModule,
        ThemeModule,
        LanguageModule,
        DeliveryModule
    ],
    providers: [],
})
export class ClientModule {}
