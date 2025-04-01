import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { Role } from 'src/common/entities/roles.entity';
import { RoleList } from 'src/common/entities/role_list.entity';
import { AdminAuthModule } from 'src/modules/back/auth/auth.module';
import { MinioService } from '../services/file/minio.service';
import { Users } from '../entities/user.entity';
import { Client } from '../entities/client.entity';
import { Merchant } from '../entities/merchant.entity';
import { Providers } from '../entities/provider.entity';
import { DeliveryPerson } from '../entities/delivery_persons.entity';
import { StripeService } from '../services/stripe/stripe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Role, RoleList, Users, Client, Merchant, Providers, DeliveryPerson]),
    AdminAuthModule, 

  ],
  providers: [
    MinioService,
    StripeService
  ],
  exports: [
    TypeOrmModule,
    AdminAuthModule,
    MinioService,
    StripeService,
  ],
})
export class SharedModule {}
