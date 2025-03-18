import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { ProvidersService } from './provider.service';
import { ProvidersController } from './provider.controller';
import { JwtService } from 'src/config/jwt.service';
import { SharedModule } from 'src/common/shared/shared.module';
import { Languages } from 'src/common/entities/languages.entity';
import { ProviderContracts } from 'src/common/entities/providers_contracts.entity';
import { ProviderDocuments } from 'src/common/entities/providers_documents.entity';
import { ProviderKeywords } from 'src/common/entities/provider_keyword.entity';
import { ProviderKeywordsList } from 'src/common/entities/provider_keywords_list.entity';
import { Providers } from 'src/common/entities/provider.entity';
import { Services } from 'src/common/entities/service.entity';
import { ServicesList } from 'src/common/entities/services_list.entity';
import { Users } from 'src/common/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Languages, ProviderContracts, ProviderDocuments, ProviderKeywords, ProviderKeywordsList, Providers, Services, ServicesList, Users]),
    JwtModule.register({}),
    SharedModule
  ],
  providers: [ProvidersService, JwtService], 
  controllers: [ProvidersController], 
  exports: [ProvidersService, TypeOrmModule, JwtModule],
})
export class ProviderModule {}
