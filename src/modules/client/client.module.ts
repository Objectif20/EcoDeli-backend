import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RegisterModule } from './register/register.module';
import { TutorialModule } from './tutoriel/tuto.module';
import { ThemeModule } from './theme/theme.module';
import { LanguageModule } from './langue/langue.module';
import { ServiceModule } from './services/service.module';
import { DeliveryModule } from './delivery/delivery.module';
import { UtilsModule } from './utils/utils.module';
import { ProfileModule } from './profile/profile.module';
import { MessagesModule } from './message/message.module';
import { PlanningModule } from './planning/planning.module';
import { DeliverymanModule } from './deliveryman/deliveryman.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
    imports: [
        AuthModule,
        RegisterModule,
        TutorialModule,
        ThemeModule,
        LanguageModule,
        ServiceModule,
        DeliveryModule,
        UtilsModule,
        ProfileModule,
        MessagesModule,
        PlanningModule,
        DeliverymanModule,
        DashboardModule
    ],
    providers: [],
})
export class ClientModule {}
