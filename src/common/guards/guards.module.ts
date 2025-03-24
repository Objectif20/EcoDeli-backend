import { Module } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminJwtGuard } from './admin-jwt.guard';
import { SharedModule } from '../shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { ClientJwtGuard } from './user-jwt.guard';


@Module({
    imports: [SharedModule],
  providers: [AdminRoleGuard, AdminJwtGuard, JwtService, ClientJwtGuard],
  exports: [AdminRoleGuard, AdminJwtGuard, ClientJwtGuard],
})
export class GuardsModule {}
