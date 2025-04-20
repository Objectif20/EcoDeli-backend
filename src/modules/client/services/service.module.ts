import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServicesList } from 'src/common/entities/services_list.entity';
import { ServiceImage } from 'src/common/entities/services_image.entity';
import { Providers } from 'src/common/entities/provider.entity';
import { Services } from 'src/common/entities/service.entity';
import { FavoriteService } from 'src/common/entities/favorite_services.entity';
import { Appointments } from 'src/common/entities/appointments.entity';
import { ProviderKeywords } from 'src/common/entities/provider_keyword.entity';
import { PrestaReview } from 'src/common/entities/presta_reviews.entity';
import { PrestaReviewResponse } from 'src/common/entities/presta_review_responses.entity';
import { Client } from 'src/common/entities/client.entity';
import { SharedModule } from 'src/common/shared/shared.module';
import { ProviderKeywordsList } from 'src/common/entities/provider_keywords_list.entity';
import { JwtModule } from '@nestjs/jwt';
import { ProviderCommission } from 'src/common/entities/provider_commissions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServicesList,
      ServiceImage,
      Providers,
      Services,
      FavoriteService,
      Appointments,
      ProviderKeywords,
      PrestaReview,
      PrestaReviewResponse,
      ProviderKeywordsList,
      Client,
      ProviderCommission
    ]),
    SharedModule,
    JwtModule.register({})
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule {}
