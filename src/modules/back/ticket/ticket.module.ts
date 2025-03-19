import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { Ticket } from "src/common/entities/ticket.entity";
import { TicketService } from "./ticket.service";
import { TicketController } from "./ticket.controller";
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket]),
        JwtModule.register({}),
        SharedModule
    ],
    providers: [TicketService, JwtService],
    controllers: [TicketController],
    exports: [TypeOrmModule, TypeOrmModule, JwtModule],
})
export class TicketModule { }