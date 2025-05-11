import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';


@Module({
    imports: [
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
