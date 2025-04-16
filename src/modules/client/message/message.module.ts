import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesGateway } from './message.gateway';
import { Message, MessageSchema } from 'src/common/schemas/message.schema';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtModule } from '@nestjs/jwt';
import { ProfileService } from '../profile/profile.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from "src/common/entities/user.entity";
import { Client } from "src/common/entities/client.entity";
import { Providers } from "src/common/entities/provider.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { Subscription } from "src/common/entities/subscription.entity";
import { Plan } from "src/common/entities/plan.entity";
import { ProviderDocuments } from 'src/common/entities/providers_documents.entity';
import { Blocked } from 'src/common/entities/blocked.entity';
import { Report } from 'src/common/entities/report.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    TypeOrmModule.forFeature([Users, Client, Providers, DeliveryPerson, Merchant, Subscription, Plan, ProviderDocuments, Blocked, Report]),
    
        SharedModule,
        JwtModule.register({})
  ],
  providers: [MessagesGateway, ProfileService],
})
export class MessagesModule {}
