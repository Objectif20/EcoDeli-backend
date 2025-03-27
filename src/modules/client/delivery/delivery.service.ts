import { InjectRepository } from "@nestjs/typeorm";
import { Delivery } from "src/common/entities/delivery.entity";
import { DeliveryKeyword } from "src/common/entities/delivery_keywords.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Keyword } from "src/common/entities/keywords.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { Users } from "src/common/entities/user.entity";

export class DeliveryService {

    constructor(
        @InjectRepository(Delivery)
        private readonly deliveryRepository: Delivery,
        @InjectRepository(Shipment)
        private readonly shipmentRepository: Shipment,
        @InjectRepository(Keyword)
        private readonly keywordRepository: Keyword,
        @InjectRepository(DeliveryKeyword)
        private readonly deliveryKeywordRepository: DeliveryKeyword,
        @InjectRepository(Users)
        private readonly userRepository : Users,
        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Delivery
    ) {}

}