import { DeliveryReview } from 'src/common/entities/delivery_reviews.entity';
import { ReviewAsClient, ReviewAsDeliveryPerson, SubscriptionForClient } from './types';
import { Shipment } from 'src/common/entities/shipment.entity';
import { Warehouse } from 'src/common/entities/warehouses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Client } from 'src/common/entities/client.entity';
import { Merchant } from 'src/common/entities/merchant.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from 'src/common/schemas/message.schema';
import { Delivery } from 'src/common/entities/delivery.entity';
import { Users } from 'src/common/entities/user.entity';
import { DeliveryReviewResponse } from 'src/common/entities/delivery_review_responses.entity';

export class DeliveryUtilsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(DeliveryReview)
    private readonly deliveryReviewRepository: Repository<DeliveryReview>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(DeliveryReviewResponse)
    private readonly deliveryReviewResponseRepository: Repository<DeliveryReviewResponse>,

    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async askToNegociate(shipment_id: string, user_id: string): Promise<{ message: string }> {
    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id },
      relations: ['user'],
    });
    if (!shipment) {
      throw new Error('Delivery not found.');
    }

    const deliverPerson = await this.deliveryPersonRepository.findOne({
      where: { user: { user_id } },
      relations: ['user'],
    });
    if (!deliverPerson) {
      throw new Error('Delivery person not found.');
    }

    const client_id = shipment.user.user_id;

    let shipment_owner: Client | Merchant | undefined = undefined;

    const foundClient = await this.clientRepository.findOne({
      where: { user: { user_id: client_id } },
      relations: ['user'],
    });

    if (foundClient) {
      shipment_owner = foundClient;
    } else {
      const foundMerchant = await this.merchantRepository.findOne({
        where: { user: { user_id: client_id } },
        relations: ['user'],
      });
      if (foundMerchant) {
        shipment_owner = foundMerchant;
      }
    }

    if (!shipment_owner) {
      throw new Error('Shipment owner (client or merchant) not found.');
    }

    const deliveryName = shipment.description || 'votre demande de livraison';
    const messageContent = `Bonjour, je serais intéressé pour effectuer la livraison de "${deliveryName}", mais je ne pourrais en assurer l'intégralité. Seriez-vous intéressé pour que j'assure une partie ?`;

    const newMessage = new this.messageModel({
      senderId: deliverPerson.user.user_id,
      receiverId: client_id,
      content: messageContent,
    });
    await newMessage.save();

    return { message: 'Negotiation request sent successfully.' };
  }

  async getWarehouseList(): Promise<Warehouse[]> {
    const warehouses = await this.warehouseRepository.find({ where: {} });

    return warehouses;
  }

  async getMyCurrentShipmentsForNegoctation(user_id: string): Promise<
    {
      shipment_id: string;
      description: string;
      date: string;
      estimated_total_price: number;
    }[]
  > {
    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
    });

    if (!user) {
      throw new Error('User or delivery person profile not found.');
    }

    const shipments = await this.shipmentRepository.find({
      where: {
        user: { user_id: user.user_id },
        status: 'pending',
        trolleydrop: false,
      },
      relations: ['deliveries', 'stores', 'stores.exchangePoint'],
    });

    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return new Date().toISOString().split('T')[0];
      return `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };

    const calculateDepartureDate = (shipment: any): string => {
      const deliveries = shipment.deliveries;

      const sortedDeliveries = deliveries.sort(
        (a: any, b: any) => a.shipment_step - b.shipment_step,
      );

      const step0 = sortedDeliveries.find((delivery: any) => delivery.shipment_step === 0);
      const step1 = sortedDeliveries.find((delivery: any) => delivery.shipment_step === 1);

      let departure_date: string;

      if (step0) {
        departure_date = formatDate(step0.send_date);
      } else {
        departure_date = formatDate(shipment.deadline_date);

        if (step1) {
          departure_date = formatDate(step1.send_date);
        }
      }

      return departure_date;
    };

    const calculateTotalPrice = (shipment: any): number => {
      console.log('Calculating total price for shipment:', shipment);
      console.log('Proposed Delivery Price:', shipment.proposed_delivery_price);
      console.log('Estimated Total Price:', shipment.estimated_total_price);

      // Convertir les prix en nombre de manière sécurisée
      let initialPrice = Number(shipment.proposed_delivery_price);
      if (isNaN(initialPrice) || initialPrice <= 0) {
        initialPrice = Number(shipment.estimated_total_price);
      }

      if (isNaN(initialPrice) || initialPrice < 0) {
        console.error('Invalid initial price, setting to 0');
        initialPrice = 0;
      }

      const deliveries = shipment.deliveries || [];

      const showArrivalHandling =
        shipment.arrival_handling &&
        !deliveries.some((delivery: any) => delivery.shipment_step === 1);
      const showDepartureHandling =
        shipment.departure_handling &&
        !deliveries.some((delivery: any) => delivery.shipment_step === 1000);

      let totalPrice = initialPrice;
      if (showArrivalHandling) totalPrice += 29;
      if (showDepartureHandling) totalPrice += 29;

      console.log('Initial Price:', initialPrice);
      console.log('Show Arrival Handling:', showArrivalHandling);
      console.log('Show Departure Handling:', showDepartureHandling);
      console.log('Total Price:', totalPrice);

      if (isNaN(totalPrice)) {
        console.error('Total price calculation resulted in NaN, setting to 0');
        totalPrice = 0;
      }

      return totalPrice;
    };

    return shipments.map((shipment) => ({
      shipment_id: shipment.shipment_id,
      description: shipment.description || '',
      date: calculateDepartureDate(shipment),
      estimated_total_price: calculateTotalPrice(shipment),
    }));
  }

  async getReviewsForDeliveryPerson(
    user_id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: ReviewAsDeliveryPerson[]; totalRows: number }> {
    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where: {
        delivery_person: { user: { user_id: user_id } },
        status: 'validated',
      },
      relations: [
        'deliveryReviews',
        'deliveryReviews.responses',
        'shipment',
        'shipment.user',
        'shipment.user.clients',
        'shipment.user.merchant',
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const reviews: ReviewAsDeliveryPerson[] = [];

    for (const delivery of deliveries) {
      let clientOrMerchant;
      if (delivery.shipment.user.clients.length > 0) {
        clientOrMerchant = delivery.shipment.user.clients[0];
      } else if (delivery.shipment.user.merchant) {
        clientOrMerchant = delivery.shipment.user.merchant[0];
      }

      for (const review of delivery.deliveryReviews) {
        const response = review.responses.length > 0 ? review.responses[0] : null;

        reviews.push({
          id: review.review_id,
          content: review.comment || '',
          author: {
            id: delivery.shipment.user.user_id,
            name: clientOrMerchant
              ? `${clientOrMerchant.first_name} ${clientOrMerchant.last_name}`
              : 'Unknown',
            photo: delivery.shipment.user.profile_picture || '',
          },
          reply: response ? true : false,
          reply_content: response ? response.comment : null,
          delivery_name: delivery.shipment.description || '',
          rate: review.rating,
        });
      }
    }

    return { data: reviews, totalRows: total };
  }

  async replyComment(
    comment: string,
    userId: string,
    commentId: string,
  ): Promise<{ message: string }> {
    const deliveryReview = await this.deliveryReviewRepository.findOne({
      where: { review_id: commentId },
      relations: ['responses', 'delivery'],
    });

    if (!deliveryReview) {
      throw new Error('Comment not found.');
    }

    console.log('Delivery Review:', deliveryReview);

    const delivery = await this.deliveryRepository.findOne({
      where: { delivery_id: deliveryReview.delivery.delivery_id },
      relations: ['delivery_person', 'shipment', 'shipment.user', 'delivery_person.user'],
    });
    if (!delivery) {
      throw new Error('Delivery not found.');
    }

    if (delivery.delivery_person.user.user_id !== userId) {
      throw new Error('User is not authorized to reply to this comment.');
    }

    const deliveryReviewResponse = new DeliveryReviewResponse();
    deliveryReviewResponse.comment = comment;
    deliveryReviewResponse.review = deliveryReview;

    await this.deliveryReviewResponseRepository.save(deliveryReviewResponse);

    return { message: 'Comment replied successfully' };
  }

  async getMyReviewsAsClient(
    user_id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: ReviewAsClient[]; totalRows: number }> {
    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where: {
        shipment: { user: { user_id: user_id } },
        status: 'validated',
      },
      relations: [
        'deliveryReviews',
        'deliveryReviews.responses',
        'delivery_person',
        'delivery_person.user',
        'delivery_person.user.clients',
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const reviews: ReviewAsClient[] = [];

    for (const delivery of deliveries) {
      const deliveryPerson = delivery.delivery_person.user;
      const client = deliveryPerson.clients.find(
        (client) => client.user.user_id === deliveryPerson.user_id,
      );

      for (const review of delivery.deliveryReviews) {
        reviews.push({
          id: review.review_id,
          content: review.comment || '',
          delivery: {
            id: delivery.delivery_id,
            deliveryman: {
              id: deliveryPerson.user_id,
              name: `${client?.first_name || ''} ${client?.last_name || ''}`,
              photo: deliveryPerson.profile_picture || '',
              email: deliveryPerson.email || '',
            },
          },
          services_name: delivery.shipment.description || '',
          rate: review.rating,
        });
      }
    }

    return { data: reviews, totalRows: total };
  }

  async getSubscriptionPlanForClient(user_id: string): Promise<SubscriptionForClient> {
    const user = await this.userRepository.findOne({
      where: { user_id },
      relations: ['clients', 'subscriptions', 'subscriptions.plan'],
    });
    if (!user) {
      throw new Error('User not found');
    }

    const subscription = user.subscriptions.find((sub) => sub.status === 'active');

    if (!subscription) {
      return {
        planName: 'Free',
        priorityRate: 0.15,
        insuranceLimit: null,
        additionalInsuranceCost: null,
      };
    }

    const subscriptionForClient: SubscriptionForClient = {
      planName: subscription.plan.name,
      discountRate: subscription.plan.shipping_discount,
      priorityRate: subscription.plan.priority_shipping_percentage,
      insuranceLimit: subscription.plan.max_insurance_coverage,
      additionalInsuranceCost: subscription.plan.extra_insurance_price,
      freeShipmentAvailable:
        subscription.plan.first_shipping_free && !subscription.first_shipping_free_taken,
      freePriorityShipmentsPerMonth: subscription.plan.priority_months_offered,
      freePriotiryShipmentsIfLower: subscription.plan.first_shipping_free_threshold,
      permanentDiscount: subscription.plan.permanent_discount,
      hasUsedFreeShipment: false,
      remainingPriorityShipments: subscription.plan.priority_months_offered,
    };

    return subscriptionForClient;
  }

  async addComment(
    comment: string,
    userId: string,
    deliveryId: string,
    rate: number,
  ): Promise<{ message: string }> {
    const delivery = await this.deliveryRepository.findOne({
      where: { delivery_id: deliveryId },
      relations: ['shipment', 'shipment.user'],
    });

    if (!delivery) {
      throw new Error('Delivery not found.');
    }

    if (delivery.status !== 'validated') {
      throw new Error('Delivery is not validated.');
    }

    console.log('delivery', delivery);
    console.log('userId', userId);
    console.log('delivery.shipment.user.user_id', delivery.shipment.user.user_id);

    if (delivery.shipment.user.user_id !== userId) {
      throw new Error('User is not authorized to comment on this delivery.');
    }

    const deliveryReview = new DeliveryReview();
    deliveryReview.comment = comment;
    deliveryReview.rating = 0;
    deliveryReview.delivery = delivery;
    deliveryReview.rating = rate;

    await this.deliveryReviewRepository.save(deliveryReview);

    return { message: 'Comment added successfully' };
  }
}
