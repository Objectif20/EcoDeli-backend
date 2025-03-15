import { Module } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminJwtGuard } from './admin-jwt.guard';
import { SharedModule } from '../shared/shared.module';
import { JwtService } from 'src/config/jwt.service';


@Module({
    imports: [SharedModule],
  providers: [AdminRoleGuard, AdminJwtGuard, JwtService],
  exports: [AdminRoleGuard, AdminJwtGuard],
})
export class GuardsModule {}
