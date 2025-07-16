import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Shipment } from 'src/common/entities/shipment.entity';
import { Parcel } from 'src/common/entities/parcels.entity';
import { Users } from 'src/common/entities/user.entity';
import { MinioService } from 'src/common/services/file/minio.service';
import { Delivery } from 'src/common/entities/delivery.entity';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Favorite } from 'src/common/entities/favorites.entity';
import { DeliveryReviewResponse } from 'src/common/entities/delivery_review_responses.entity';
import { DeliveryReview } from 'src/common/entities/delivery_reviews.entity';
import { Warehouse } from 'src/common/entities/warehouses.entity';
import { ExchangePoint } from 'src/common/entities/exchange_points.entity';
import { Store } from 'src/common/entities/stores.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { Client } from 'src/common/entities/client.entity';
import { DeliveryCommission } from 'src/common/entities/delivery_commission.entity';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { BookPartialDTO } from './dto/book-partial.dto';
import {
  CurrentDeliveryAsClient,
  DeliveriesLocation,
  DeliveryDetails,
  DeliveryHistoryAsClient,
  DeliveryOnGoing,
  HistoryDelivery,
} from './types';
import axios from 'axios';
import { Merchant } from 'src/common/entities/merchant.entity';
import { PdfService } from 'src/common/services/pdf/pdf.service';
import { ShipmentDetails } from 'src/common/services/pdf/type';
import * as nodemailer from 'nodemailer';
import { Readable } from 'stream';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from 'src/common/schemas/message.schema';
import { Model } from 'mongoose';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,

    @InjectRepository(Parcel)
    private readonly parcelRepository: Repository<Parcel>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,

    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,

    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,

    @InjectRepository(DeliveryReviewResponse)
    private readonly deliveryReviewResponseRepository: Repository<DeliveryReviewResponse>,

    @InjectRepository(DeliveryReview)
    private readonly deliveryReviewRepository: Repository<DeliveryReview>,

    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,

    @InjectRepository(ExchangePoint)
    private readonly exchangePointRepository: Repository<ExchangePoint>,

    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,

    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,

    @InjectRepository(DeliveryCommission)
    private readonly deliveryCommissionRepository: Repository<DeliveryCommission>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
    private readonly pdfService: PdfService,
    private readonly minioService: MinioService,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async bookDelivery(
    id: string,
    user_id: string,
    startDate: string,
    endDate: string,
  ): Promise<Delivery> {
    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id: id },
      relations: ['deliveries', 'stores', 'stores.exchangePoint', 'user', 'parcels'],
    });

    if (!shipment) {
      throw new Error('Shipment not found.');
    }

    const user = await this.userRepository.findOne({
      where: { user_id },
      relations: ['deliveryPerson'],
    });

    if (!user || !user.deliveryPerson) {
      throw new Error('User or delivery person profile not found.');
    }

    const existingSteps = shipment.deliveries.map((d) => d.shipment_step);
    const isFinalStep = existingSteps.includes(1);
    const shipment_step = isFinalStep ? 1000 : 0;

    const reverseCoords = (point: any) => {
      if (!point || !point.coordinates) return null;
      return [...point.coordinates].reverse();
    };

    const commissions = await this.deliveryCommissionRepository.findOne({ where: {} });

    let existingDelivery = await this.deliveryRepository.findOne({
      where: { shipment: { shipment_id: id } },
      relations: ['shipment'],
    });

    let delivery_code: string;

    if (existingDelivery && existingDelivery.delivery_code) {
      delivery_code = existingDelivery.delivery_code;
    } else {
      delivery_code = crypto.randomBytes(5).toString('hex').slice(0, 10);
    }

    let totalAmount = shipment.proposed_delivery_price ?? 0;

    if (isNaN(totalAmount)) {
      totalAmount = 0;
    }

    if (shipment_step < 2 && shipment.departure_handling) {
      totalAmount += 29;
    }
    if ((shipment_step === 0 || shipment_step) && shipment.arrival_handling) {
      totalAmount += 29;
    }

    const delivery = this.deliveryRepository.create({
      send_date: new Date(startDate),
      delivery_date: new Date(endDate),
      status: 'pending',
      amount: totalAmount,
      shipment: shipment,
      delivery_person: user.deliveryPerson,
      shipment_step,
      delivery_commission: commissions ?? undefined,
      delivery_code,
    });

    if (shipment_step === 0) {
      const qrCodeBase64 = await QRCode.toDataURL(delivery_code);

      const shipmentDetails: ShipmentDetails = {
        deliveryCode: delivery_code,
        departureCity: shipment.departure_city || shipment.departure_location?.coordinates,
        departureAddress: shipment.departure_address || shipment.departure_location?.coordinates,
        arrivalCity: shipment.arrival_city || shipment.arrival_location?.coordinates,
        arrivalAddress: shipment.arrival_address || shipment.arrival_location?.coordinates,
        numberOfPackages: shipment.parcels.length,
        totalWeight: shipment.parcels.reduce((sum, parcel) => sum + (parcel.weight ?? 0), 0),
        qrCodeBase64: qrCodeBase64,
      };

      const pdfBuffer = await this.pdfService.generateBordereauPdf(shipmentDetails);
      const fromEmail = this.mailer.options.auth.user;
      await this.mailer.sendMail({
        from: fromEmail,
        to: shipment.user.email,
        subject: 'Votre Bordereau de Colis',
        html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
                        <h2 style="color: #2a9d8f;">📄 Bordereau de Colis</h2>
                        <p>Bonjour,</p>
                        <p>Veuillez trouver en pièce jointe votre <strong>bordereau de colis</strong> concernant l'envoi numéro <strong>${shipment.shipment_id}</strong>.</p>
                        <p>Nous restons à votre disposition pour toute question.</p>
                        <p style="margin-top: 20px;">Cordialement,<br>L'équipe Écodeli</p>
                        </div>
                    `,
        attachments: [
          {
            filename: `bordereau_${shipment.shipment_id}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: `bordereau_${shipment.shipment_id}.pdf`,
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        destination: '',
        filename: `bordereau_${shipment.shipment_id}.pdf`,
        path: '',
        stream: Readable.from(pdfBuffer),
      };

      const filePath = `shipments/${shipment.shipment_id}/bordereau_${shipment.shipment_id}.pdf`;
      await this.minioService.uploadFileToBucket('client-images', filePath, file);
    }

    const savedDelivery = await this.deliveryRepository.save(delivery);

    const message = new this.messageModel({
      senderId: user.user_id,
      receiverId: shipment.user.user_id,
      content: `Bonjour, j'ai pris en charge votre livraison pour le colis ${shipment.description}. Si vous avez des questions, n'hésitez pas à me contacter.`,
    });
    await message.save();

    await this.notifyPreviousDeliveryPersonIfNeeded(savedDelivery, shipment);

    return savedDelivery;
  }

  async bookPartial(dto: BookPartialDTO, shipment_id: string): Promise<Delivery> {
    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id },
      relations: ['stores', 'stores.exchangePoint', 'user', 'parcels'],
    });

    if (!shipment) {
      throw new Error('Shipment not found.');
    }

    const user = await this.userRepository.findOne({
      where: { user_id: dto.delivery_person_id },
      relations: ['deliveryPerson'],
    });

    if (!user || !user.deliveryPerson) {
      throw new Error('User or delivery person profile not found.');
    }

    const existingSteps = shipment.stores.map((store) => store.step);
    const nextStep = existingSteps.length > 0 ? Math.max(...existingSteps) + 1 : 1;

    let exchangePoint: ExchangePoint;
    let city: string;
    let coordinates: { type: string; coordinates: [number, number] };
    let address: string | undefined;
    let postal_code: string | undefined;
    let warehouse_id: string | undefined;

    if (dto.warehouse_id) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { warehouse_id: dto.warehouse_id },
      });

      if (!warehouse) {
        throw new Error('Warehouse not found.');
      }

      city = warehouse.city;
      coordinates = warehouse.coordinates;
      address = warehouse.address;
      postal_code = warehouse.postal_code;
      warehouse_id = warehouse.warehouse_id;
    } else if (dto.city && dto.latitude && dto.longitude) {
      city = dto.city;
      coordinates = {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      };

      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            format: 'json',
            lat: dto.latitude,
            lon: dto.longitude,
          },
          headers: {
            'User-Agent': 'EcoDeli/1.0 (contact.ecodeli@gmail.com)',
          },
        });

        const data = response.data;

        if (data?.address) {
          address = data.address.road || data.display_name || undefined;
          postal_code = data.address.postcode || undefined;
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'adresse depuis Nominatim:", error);
      }
    } else {
      throw new Error('You must provide either a warehouse_id or city, latitude, and longitude.');
    }

    exchangePoint = this.exchangePointRepository.create({
      city,
      coordinates,
      warehouse_id,
      address,
      postal_code,
    });

    await this.exchangePointRepository.save(exchangePoint);

    const endDate = dto.endDate || undefined;
    const startDate = dto.startDate || undefined;

    await this.storeRepository.insert({
      shipment_id: shipment.shipment_id,
      exchange_point_id: exchangePoint.exchange_point_id,
      step: nextStep,
      start_date: startDate,
      end_date: endDate,
    });

    await this.shipmentRepository.update(
      { shipment_id: shipment.shipment_id },
      { proposed_delivery_price: dto.new_price },
    );

    const delivery_code = crypto
      .createHmac('sha256', 'secret')
      .update(shipment.shipment_id)
      .digest('hex')
      .slice(0, 10);

    const commissions = await this.deliveryCommissionRepository.findOne({ where: {} });

    const delivery = this.deliveryRepository.create({
      send_date: startDate,
      delivery_date: endDate,
      status: 'pending',
      amount: dto.price,
      shipment: shipment,
      delivery_person: user.deliveryPerson,
      shipment_step: nextStep,
      delivery_commission: commissions ?? undefined,
      delivery_code,
    });

    if (nextStep === 1) {
      const qrCodeBase64 = await QRCode.toDataURL(delivery_code);

      const shipmentDetails: ShipmentDetails = {
        deliveryCode: delivery_code,
        departureCity: shipment.departure_city || shipment.departure_location?.coordinates,
        departureAddress: shipment.departure_address || shipment.departure_location?.coordinates,
        arrivalCity: shipment.arrival_city || shipment.arrival_location?.coordinates,
        arrivalAddress: shipment.arrival_address || shipment.arrival_location?.coordinates,
        numberOfPackages: shipment.parcels.length,
        totalWeight: shipment.parcels.reduce((sum, parcel) => sum + (parcel.weight ?? 0), 0),
        qrCodeBase64: qrCodeBase64,
      };

      const pdfBuffer = await this.pdfService.generateBordereauPdf(shipmentDetails);
      const fromEmail = this.mailer.options.auth.user;
      await this.mailer.sendMail({
        from: fromEmail,
        to: shipment.user.email,
        subject: 'Votre Bordereau de Colis',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #2a9d8f;">📄 Bordereau de Colis</h2>
        <p>Bonjour,</p>
        <p>Veuillez trouver en pièce jointe votre bordereau de colis.</p>
        <p><strong>Merci d'imprimer ce document et de le coller sur chaque carton à expédier.</strong></p>
        <p>Cette étape est essentielle pour assurer un suivi optimal de vos envois.</p>
        <p style="margin-top: 20px;">Cordialement,<br>L'équipe Écodeli</p>
      </div>
    `,
        attachments: [
          {
            filename: `bordereau_${shipment.shipment_id}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: `bordereau_${shipment.shipment_id}.pdf`,
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        destination: '',
        filename: `bordereau_${shipment.shipment_id}.pdf`,
        path: '',
        stream: Readable.from(pdfBuffer),
      };

      const filePath = `shipments/${shipment.shipment_id}/bordereau_${shipment.shipment_id}.pdf`;
      await this.minioService.uploadFileToBucket('client-images', filePath, file);
    }

    const savedDelivery = await this.deliveryRepository.save(delivery);
    await this.notifyPreviousDeliveryPersonIfNeeded(savedDelivery, shipment);
    return savedDelivery;
  }

  private async notifyPreviousDeliveryPersonIfNeeded(
    currentDelivery: Delivery,
    shipment: Shipment,
  ) {
    if (currentDelivery.shipment_step <= 0) return;

    const previousStep = currentDelivery.shipment_step - 1;

    const previousDelivery = await this.deliveryRepository.findOne({
      where: {
        shipment: { shipment_id: shipment.shipment_id },
        shipment_step: previousStep,
      },
      relations: ['delivery_person', 'shipment'],
    });

    if (!previousDelivery) return;

    const previousStore = await this.storeRepository.findOne({
      where: {
        shipment_id: shipment.shipment_id,
        step: previousStep,
      },
      relations: ['exchangePoint'],
    });

    if (!previousStore || !previousStore.exchangePoint) return;

    const exchangePoint = previousStore.exchangePoint;

    if (exchangePoint.warehouse_id || exchangePoint.isbox) return;

    const sameDay =
      previousDelivery.delivery_date &&
      currentDelivery.send_date &&
      previousDelivery.delivery_date.toDateString() === currentDelivery.send_date.toDateString();

    if (!sameDay) return;

    if (
      previousDelivery.delivery_person.user.user_id === currentDelivery.delivery_person.user.user_id
    ) {
      return;
    }

    const message = new this.messageModel({
      senderId: currentDelivery.delivery_person.user.user_id,
      receiverId: previousDelivery.delivery_person.user.user_id,
      content: `Bonjour, je suis le prochain livreur pour le colis "${shipment.description}". Nous devons nous coordonner pour l'échange prévu le ${currentDelivery.send_date.toLocaleDateString()}.`,
    });

    await message.save();
  }

  async getOngoingDeliveries(user_id: string): Promise<DeliveryOnGoing[]> {
    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
      relations: ['deliveryPerson'],
    });

    if (!user || !user.deliveryPerson) {
      throw new Error('User or delivery person profile not found.');
    }

    const deliveries = await this.deliveryRepository.find({
      where: {
        delivery_person: { delivery_person_id: user.deliveryPerson.delivery_person_id },
        status: In(['taken', 'pending', 'finished']),
      },
      relations: [
        'shipment',
        'shipment.stores',
        'shipment.stores.exchangePoint',
        'shipment.stores.exchangePoint.warehouse',
      ],
    });

    const ongoingDeliveries: DeliveryOnGoing[] = deliveries.map((delivery) => {
      const shipment = delivery.shipment;
      const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);
      const step = delivery.shipment_step;

      let originCoordinates: [number, number] = [0, 0];
      let destinationCoordinates: [number, number] = [0, 0];
      let currentCoordinates: [number, number] = [0, 0];
      let fromCity: string = '';
      let toCity: string = '';
      let pickupDate: string | null = null;
      let estimatedDeliveryDate: string | null = null;
      let progress = 0;

      if (step === 0) {
        // Étape 0: Origine → Premier store ou destination finale
        fromCity = shipment.departure_city || 'Unknown';
        originCoordinates = shipment.departure_location?.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        currentCoordinates = originCoordinates;

        const firstStore = storesByStep[0];
        if (firstStore?.exchangePoint) {
          toCity = firstStore.exchangePoint.city;
          destinationCoordinates = firstStore.exchangePoint.coordinates.coordinates
            ?.slice()
            .reverse() as [number, number];
        } else {
          toCity = shipment.arrival_city || 'Unknown';
          destinationCoordinates = shipment.arrival_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ];
        }

        pickupDate = delivery.send_date?.toISOString().split('T')[0] || null;
        estimatedDeliveryDate = delivery.delivery_date?.toISOString().split('T')[0] || null;
        progress = 0;
      } else if (step === 1000) {
        // Étape finale: Dernier store → Destination finale
        const lastStore = storesByStep[storesByStep.length - 1];
        if (lastStore?.exchangePoint) {
          fromCity = lastStore.exchangePoint.city;
          originCoordinates = lastStore.exchangePoint.coordinates.coordinates
            ?.slice()
            .reverse() as [number, number];
          currentCoordinates = originCoordinates;
        } else {
          fromCity = shipment.departure_city || 'Unknown';
          originCoordinates = shipment.departure_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ];
          currentCoordinates = originCoordinates;
        }

        toCity = shipment.arrival_city || 'Unknown';
        destinationCoordinates = shipment.arrival_location?.coordinates?.slice().reverse() as [
          number,
          number,
        ];

        pickupDate = delivery.send_date?.toISOString().split('T')[0] || null;
        estimatedDeliveryDate = delivery.delivery_date?.toISOString().split('T')[0] || null;
        progress = 100;
      } else {
        // Étape intermédiaire: Store précédent → Store actuel
        const prevStore = storesByStep.find((s) => s.step === step - 1);
        const currStore = storesByStep.find((s) => s.step === step);

        if (prevStore?.exchangePoint) {
          fromCity = prevStore.exchangePoint.city;
          originCoordinates = prevStore.exchangePoint.coordinates.coordinates
            ?.slice()
            .reverse() as [number, number];
          currentCoordinates = originCoordinates;
        } else {
          fromCity = shipment.departure_city || 'Unknown';
          originCoordinates = shipment.departure_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ];
          currentCoordinates = originCoordinates;
        }

        if (currStore?.exchangePoint) {
          toCity = currStore.exchangePoint.city;
          destinationCoordinates = currStore.exchangePoint.coordinates.coordinates
            ?.slice()
            .reverse() as [number, number];
        } else {
          toCity = shipment.arrival_city || 'Unknown';
          destinationCoordinates = shipment.arrival_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ];
        }

        pickupDate = delivery.send_date?.toISOString().split('T')[0] || null;
        estimatedDeliveryDate = delivery.delivery_date?.toISOString().split('T')[0] || null;

        const totalSteps = storesByStep.length + 1;
        progress = (step / totalSteps) * 100;
      }

      return {
        id: delivery.delivery_id,
        from: fromCity,
        to: toCity,
        status: delivery.status,
        pickupDate: pickupDate,
        estimatedDeliveryDate: estimatedDeliveryDate,
        coordinates: {
          origin: originCoordinates,
          destination: destinationCoordinates,
          current: currentCoordinates,
        },
        progress: progress,
      };
    });

    return ongoingDeliveries;
  }

  async getMyDeliveryHistory(
    user_id: string,
    page: number,
    limit: number,
  ): Promise<{ data: HistoryDelivery[]; totalRows: number }> {
    const pageNumber = typeof page === 'number' ? page : 1;
    const pageSize = typeof limit === 'number' ? limit : 10;

    console.log('user_id', user_id);

    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
      relations: ['deliveryPerson'],
    });

    if (!user || !user.deliveryPerson) {
      throw new Error('User or delivery person profile not found.');
    }

    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where: {
        delivery_person: { delivery_person_id: user.deliveryPerson.delivery_person_id },
      },
      relations: ['shipment', 'shipment.stores', 'shipment.stores.exchangePoint', 'shipment.user'],
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      order: { send_date: 'DESC' },
    });

    const historyDeliveries: HistoryDelivery[] = await Promise.all(
      deliveries.map(async (delivery) => {
        const shipment = delivery.shipment;
        const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);

        let departureCity, arrivalCity;

        if (delivery.shipment_step === 0) {
          departureCity = shipment.departure_city ?? 'Unknown';
          arrivalCity = shipment.arrival_city;
        } else if (delivery.shipment_step === 1000) {
          const lastStore = storesByStep[storesByStep.length - 1];
          departureCity = lastStore?.exchangePoint?.city ?? shipment.departure_city;
          arrivalCity = shipment.arrival_city;
        } else {
          const currentStore = storesByStep.find((store) => store.step === delivery.shipment_step);
          const previousStore = storesByStep.find(
            (store) => store.step === delivery.shipment_step - 1,
          );
          departureCity = previousStore?.exchangePoint?.city ?? shipment.departure_city;
          arrivalCity = currentStore?.exchangePoint?.city ?? shipment.arrival_city;
        }

        const client = await this.clientRepository.findOne({
          where: { user: { user_id: shipment.user.user_id } },
          relations: ['user'],
        });

        return {
          id: delivery.delivery_id,
          departure_city: departureCity,
          arrival_city: arrivalCity,
          price: delivery.amount,
          client: {
            name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            photo_url: client?.user?.profile_picture || '',
          },
          status: delivery.status,
        };
      }),
    );

    return { data: historyDeliveries, totalRows: total };
  }

  async getDeliveriesLocation(user_id: string): Promise<DeliveriesLocation[]> {
    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
      relations: ['clients'],
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const shipments = await this.shipmentRepository.find({
      where: {
        user: { user_id: user.user_id },
      },
      relations: ['stores', 'stores.exchangePoint'],
    });

    const deliveriesPromises = shipments.map(async (shipment) => {
      const deliveries = await this.deliveryRepository.find({
        where: {
          shipment: { shipment_id: shipment.shipment_id },
          status: In(['taken', 'finished']),
        },
        relations: ['delivery_person', 'delivery_person.user', 'delivery_person.user.clients'],
      });

      return deliveries.map(async (delivery) => {
        const deliveryPersonClient = delivery.delivery_person?.user.clients[0];
        return {
          id: delivery.delivery_id,
          coordinates: {
            lat: shipment.departure_location.coordinates[1],
            lng: shipment.departure_location.coordinates[0],
          },
          deliveryman: delivery.delivery_person
            ? {
                id: delivery.delivery_person.user.user_id,
                name: `${deliveryPersonClient?.first_name} ${deliveryPersonClient?.last_name}`,
                photo:
                  (await this.minioService.generateImageUrl(
                    'client-images',
                    delivery.delivery_person.user.profile_picture || '',
                  )) || '',
                email: delivery.delivery_person.user.email,
              }
            : undefined,
          potential_address: shipment.arrival_location.address,
        };
      });
    });

    const deliveries = (await Promise.all(deliveriesPromises)).flat();
    const resolvedDeliveries = await Promise.all(deliveries);

    return resolvedDeliveries;
  }

  async getCurrentDeliveriesAsClient(user_id: string): Promise<CurrentDeliveryAsClient[]> {
    const user = await this.userRepository.findOne({
      where: { user_id },
      relations: ['clients'],
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const shipments = await this.shipmentRepository.find({
      where: {
        user: { user_id: user.user_id },
      },
      relations: ['stores', 'stores.exchangePoint'],
    });

    const deliveriesPromises = shipments.map(async (shipment) => {
      const deliveries = await this.deliveryRepository.find({
        where: {
          shipment: { shipment_id: shipment.shipment_id },
          status: In(['pending', 'taken', 'finished']),
        },
        relations: ['delivery_person', 'delivery_person.user', 'delivery_person.user.clients'],
      });

      const formatDate = (date: Date | null | undefined): string => {
        if (!date) return new Date().toISOString().split('T')[0];
        return `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      };

      const storesByStep = (shipment.stores || []).sort((a, b) => a.step - b.step);

      return Promise.all(
        deliveries.map(async (delivery) => {
          const deliveryPersonUser = delivery.delivery_person?.user;
          const deliveryPersonClient = deliveryPersonUser?.clients[0];

          const profilePicture = deliveryPersonUser?.profile_picture
            ? await this.minioService.generateImageUrl(
                'client-images',
                deliveryPersonUser.profile_picture,
              )
            : '';

          const deliveryPicture = shipment.image
            ? await this.minioService.generateImageUrl('client-images', shipment.image)
            : '';

          let departureCity: string;
          let arrivalCity: string;
          let departure_date: string;
          let arrival_date: string;

          const step = delivery.shipment_step;

          if (step === 0) {
            // Étape 0: Origine → Premier store ou destination finale
            departureCity = shipment.departure_city || '';

            const firstStore = storesByStep[0];
            if (firstStore?.exchangePoint) {
              arrivalCity = firstStore.exchangePoint.city;
            } else {
              arrivalCity = shipment.arrival_city || '';
            }

            departure_date = formatDate(delivery.send_date);
            arrival_date = formatDate(delivery.delivery_date);
          } else if (step === 1000) {
            // Étape finale: Dernier store → Destination finale
            const lastStore = storesByStep[storesByStep.length - 1];
            if (lastStore?.exchangePoint) {
              departureCity = lastStore.exchangePoint.city;
            } else {
              departureCity = shipment.departure_city || '';
            }

            arrivalCity = shipment.arrival_city || '';

            departure_date = formatDate(delivery.send_date);
            arrival_date = formatDate(delivery.delivery_date);
          } else {
            // Étape intermédiaire: Store précédent → Store actuel
            const prevStore = storesByStep.find((s) => s.step === step - 1);
            const currStore = storesByStep.find((s) => s.step === step);

            if (prevStore?.exchangePoint) {
              departureCity = prevStore.exchangePoint.city;
            } else {
              departureCity = shipment.departure_city || '';
            }

            if (currStore?.exchangePoint) {
              arrivalCity = currStore.exchangePoint.city;
            } else {
              arrivalCity = shipment.arrival_city || '';
            }

            departure_date = formatDate(delivery.send_date);
            arrival_date = formatDate(delivery.delivery_date);
          }

          // Vérification de cohérence des dates
          if (departure_date > arrival_date) {
            arrival_date = departure_date;
          }

          return {
            id: delivery.delivery_id,
            arrival_city: arrivalCity,
            departure_city: departureCity,
            date_departure: departure_date,
            date_arrival: arrival_date,
            photo: deliveryPicture,
            deliveryman: deliveryPersonClient
              ? {
                  name: `${deliveryPersonClient.first_name} ${deliveryPersonClient.last_name}`,
                  photo: profilePicture,
                }
              : {
                  name: 'Unknown',
                  photo: '',
                },
          };
        }),
      );
    });

    const deliveries = (await Promise.all(deliveriesPromises)).flat();

    return deliveries;
  }

  async getDeliveryHistoryAsClient(
    user_id: string,
    page: number,
    limit: number,
  ): Promise<{ data: DeliveryHistoryAsClient[]; totalRows: number }> {
    const pageNumber = Number.isInteger(page) ? page : 1;
    const pageSize = Number.isInteger(limit) ? limit : 10;

    const [shipments, total] = await this.shipmentRepository.findAndCount({
      where: { user: { user_id } },
      relations: [
        'deliveries',
        'deliveries.delivery_person',
        'deliveries.delivery_person.user',
        'deliveries.delivery_person.user.clients',
        'stores',
        'stores.exchangePoint',
      ],
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    });

    const deliveryHistory: DeliveryHistoryAsClient[] = await Promise.all(
      shipments.map(async (shipment) => {
        const validatedDeliveries = shipment.deliveries.filter(
          (delivery) => delivery.status === 'validated',
        );

        const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);

        return Promise.all(
          validatedDeliveries.map(async (delivery) => {
            let departureCity: string;
            let arrivalCity: string;

            if (delivery.shipment_step === 0) {
              departureCity = shipment.departure_city || 'Unknown';
              arrivalCity = shipment.arrival_city || 'Unknown';
            } else if (delivery.shipment_step === 1000) {
              const lastStore = storesByStep[storesByStep.length - 1];
              departureCity =
                lastStore?.exchangePoint?.city || shipment.departure_city || 'Unknown';
              arrivalCity = shipment.arrival_city || 'Unknown';
            } else {
              const currentStore = storesByStep.find(
                (store) => store.step === delivery.shipment_step,
              );
              const previousStore = storesByStep.find(
                (store) => store.step === delivery.shipment_step - 1,
              );
              departureCity =
                previousStore?.exchangePoint?.city || shipment.departure_city || 'Unknown';
              arrivalCity = currentStore?.exchangePoint?.city || shipment.arrival_city || 'Unknown';
            }

            const deliveryReview = await this.deliveryReviewRepository.findOne({
              where: { delivery_id: delivery.delivery_id },
            });

            const user = delivery.delivery_person?.user;
            const client = user?.clients?.[0];

            return {
              id: delivery.delivery_id,
              deliveryman: {
                id: delivery.delivery_person?.delivery_person_id ?? 'unknown',
                name: client ? `${client.first_name} ${client.last_name}` : 'Non défini',
                photo: user?.profile_picture || '',
              },
              departureDate: delivery.send_date?.toISOString() || '',
              arrivalDate: delivery.delivery_date?.toISOString() || '',
              departureCity,
              arrivalCity,
              announcementName: shipment.description || '',
              rate: deliveryReview?.rating ?? null,
              comment: deliveryReview?.comment ?? null,
            };
          }),
        );
      }),
    ).then((results) => results.flat());

    return { data: deliveryHistory, totalRows: total };
  }

  async getDeliveryDetails(user_id: string, delivery_id: string): Promise<DeliveryDetails> {
    const delivery = await this.deliveryRepository.findOne({
      where: { delivery_id },
      relations: [
        'delivery_person',
        'delivery_person.user',
        'shipment',
        'shipment.user',
        'shipment.stores',
        'shipment.stores.exchangePoint',
        'shipment.stores.exchangePoint.warehouse',
        'shipment.parcels',
        'shipment.parcels.images',
      ],
    });

    if (!delivery) {
      throw new Error('Delivery not found.');
    }

    const shipment = delivery.shipment;
    if (!shipment || !shipment.user) {
      throw new Error('Shipment or associated user not found.');
    }

    const isOwner = shipment.user.user_id === user_id;
    const isDeliveryPerson = delivery.delivery_person?.user?.user_id === user_id;

    if (!isOwner && !isDeliveryPerson) {
      throw new Error('Unauthorized access to delivery details.');
    }

    const storesByStep = (shipment.stores || []).sort((a, b) => a.step - b.step);

    let departureCity: string | undefined;
    let departureCoords: [number, number] | undefined;
    let departureAddress: string | undefined;
    let departurePostal: string | undefined;
    let departureHandling: boolean = false;
    let departureFloor: number = 0;
    let departureElevator: boolean = false;
    let departureIsWarehouse: boolean = false;
    let departureIsBox: boolean = false;

    let arrivalCity: string | undefined;
    let arrivalCoords: [number, number] | undefined;
    let arrivalAddress: string | undefined;
    let arrivalPostal: string | undefined;
    let arrivalHandling: boolean = false;
    let arrivalFloor: number = 0;
    let arrivalElevator: boolean = false;
    let arrivalIsWarehouse: boolean = false;
    let arrivalIsBox: boolean = false;

    const step = delivery.shipment_step;

    if (step === 0) {
      // Departure - origine du shipment
      departureCity = shipment.departure_city || '';
      departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [
        number,
        number,
      ];
      departureAddress = shipment.departure_address || '';
      departurePostal = shipment.departure_postal || '';
      departureHandling = shipment.departure_handling || false;
      departureFloor = shipment.floor_departure_handling || 0;
      departureElevator = shipment.elevator_departure || false;
      departureIsWarehouse = false;
      departureIsBox = false;

      // Arrival - premier store ou destination finale
      const firstStore = storesByStep[0];
      if (firstStore?.exchangePoint) {
        arrivalCity = firstStore.exchangePoint.city;
        arrivalCoords = firstStore.exchangePoint.coordinates.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        arrivalAddress = firstStore.exchangePoint.address;
        arrivalPostal = firstStore.exchangePoint.postal_code;
        arrivalHandling = false; // Pas de manutention dans les exchange points
        arrivalFloor = 0;
        arrivalElevator = false;
        arrivalIsWarehouse = !!firstStore.exchangePoint.warehouse;
        arrivalIsBox = firstStore.exchangePoint.isbox || false;
      } else {
        arrivalCity = shipment.arrival_city || '';
        arrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        arrivalAddress = shipment.arrival_address || '';
        arrivalPostal = shipment.arrival_postal || '';
        arrivalHandling = shipment.arrival_handling || false;
        arrivalFloor = shipment.floor_arrival_handling || 0;
        arrivalElevator = shipment.elevator_arrival || false;
        arrivalIsWarehouse = false;
        arrivalIsBox = false;
      }
    } else if (step === 1000) {
      // Departure - dernier store
      const lastStore = storesByStep[storesByStep.length - 1];
      if (lastStore?.exchangePoint) {
        departureCity = lastStore.exchangePoint.city;
        departureCoords = lastStore.exchangePoint.coordinates.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        departureAddress = lastStore.exchangePoint.address;
        departurePostal = lastStore.exchangePoint.postal_code;
        departureHandling = false; // Pas de manutention dans les exchange points
        departureFloor = 0;
        departureElevator = false;
        departureIsWarehouse = !!lastStore.exchangePoint.warehouse;
        departureIsBox = lastStore.exchangePoint.isbox || false;
      } else {
        departureCity = shipment.departure_city || '';
        departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        departureAddress = shipment.departure_address || '';
        departurePostal = shipment.departure_postal || '';
        departureHandling = shipment.departure_handling || false;
        departureFloor = shipment.floor_departure_handling || 0;
        departureElevator = shipment.elevator_departure || false;
        departureIsWarehouse = false;
        departureIsBox = false;
      }

      // Arrival - destination finale
      arrivalCity = shipment.arrival_city || '';
      arrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse() as [number, number];
      arrivalAddress = shipment.arrival_address || '';
      arrivalPostal = shipment.arrival_postal || '';
      arrivalHandling = shipment.arrival_handling || false;
      arrivalFloor = shipment.floor_arrival_handling || 0;
      arrivalElevator = shipment.elevator_arrival || false;
      arrivalIsWarehouse = false;
      arrivalIsBox = false;
    } else {
      // Departure - store précédent ou origine
      const prevStore = storesByStep.find((s) => s.step === step - 1);
      if (prevStore?.exchangePoint) {
        departureCity = prevStore.exchangePoint.city;
        departureCoords = prevStore.exchangePoint.coordinates.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        departureAddress = prevStore.exchangePoint.address;
        departurePostal = prevStore.exchangePoint.postal_code;
        departureHandling = false; // Pas de manutention dans les exchange points
        departureFloor = 0;
        departureElevator = false;
        departureIsWarehouse = !!prevStore.exchangePoint.warehouse;
        departureIsBox = prevStore.exchangePoint.isbox || false;
      } else {
        departureCity = shipment.departure_city || '';
        departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        departureAddress = shipment.departure_address || '';
        departurePostal = shipment.departure_postal || '';
        departureHandling = shipment.departure_handling || false;
        departureFloor = shipment.floor_departure_handling || 0;
        departureElevator = shipment.elevator_departure || false;
        departureIsWarehouse = false;
        departureIsBox = false;
      }

      // Arrival - store actuel
      const currStore = storesByStep.find((s) => s.step === step);
      if (currStore?.exchangePoint) {
        arrivalCity = currStore.exchangePoint.city;
        arrivalCoords = currStore.exchangePoint.coordinates.coordinates?.slice().reverse() as [
          number,
          number,
        ];
        arrivalAddress = currStore.exchangePoint.address;
        arrivalPostal = currStore.exchangePoint.postal_code;
        arrivalHandling = false; // Pas de manutention dans les exchange points
        arrivalFloor = 0;
        arrivalElevator = false;
        arrivalIsWarehouse = !!currStore.exchangePoint.warehouse;
        arrivalIsBox = currStore.exchangePoint.isbox || false;
      }
    }

    const deliveryDetails: DeliveryDetails = {
      departure: {
        city: departureCity || '',
        address: departureAddress || '',
        postalCode: departurePostal || '',
        coordinates: departureCoords ?? [0, 0],
        handling: departureHandling,
        floor: departureFloor,
        elevator: departureElevator,
        isWarehouse: departureIsWarehouse,
        isBox: departureIsBox,
      },
      arrival: {
        city: arrivalCity || '',
        address: arrivalAddress || '',
        postalCode: arrivalPostal || '',
        coordinates: arrivalCoords ?? [0, 0],
        handling: arrivalHandling,
        floor: arrivalFloor,
        elevator: arrivalElevator,
        isWarehouse: arrivalIsWarehouse,
        isBox: arrivalIsBox,
      },
      departure_date: delivery.send_date?.toISOString() || '',
      arrival_date: delivery.delivery_date?.toISOString() || '',
      status: (['pending', 'taken', 'finished', 'validated'].includes(delivery.status)
        ? delivery.status
        : 'pending') as 'pending' | 'taken' | 'finished' | 'validated',
      total_price: Number(delivery.delivery_price ?? delivery.amount),
      cart_dropped: shipment.trolleydrop,
      packages: await Promise.all(
        (shipment.parcels || []).map(async (parcel: any) => ({
          id: parcel.parcel_id,
          name: parcel.name,
          fragility: parcel.fragility,
          estimated_price: Number(parcel.estimate_price),
          weight: Number(parcel.weight),
          volume: Number(parcel.volume),
          picture: await Promise.all(
            (parcel.images || []).map((img: any) =>
              this.minioService.generateImageUrl('client-images', img.image_url),
            ),
          ),
        })),
      ),
    };

    return deliveryDetails;
  }

  async cancelDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {
    const delivery = await this.deliveryRepository.findOne({
      where: { delivery_id: deliveryId },
      relations: ['delivery_person', 'shipment', 'delivery_person.user', 'shipment.user'],
    });

    if (!delivery) {
      throw new Error('Delivery not found.');
    }

    if (delivery.delivery_person.user.user_id !== user_id) {
      throw new Error('User is not authorized to cancel this delivery.');
    }

    if (delivery.status === 'taken') {
      throw new Error('Cannot cancel a taken delivery.');
    }

    if (delivery.status === 'finished') {
      throw new Error('Cannot cancel a finished delivery.');
    }

    if (delivery.status === 'validated') {
      throw new Error('Cannot cancel a validated delivery.');
    }

    delivery.status = 'canceled';
    await this.deliveryRepository.save(delivery);

    // Logique plus tard de prévenir les gens

    return { message: 'Delivery canceled successfully.' };
  }

  // PAS ENCORE UTILISE

  async getShipmentFavorites(user_id: string, page: number, limit: number): Promise<Shipment[]> {
    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
      relations: [
        'deliveryPerson',
        'deliveryPerson.favorites',
        'deliveryPerson.favorites.shipment',
      ],
    });

    if (!user || !user.deliveryPerson) {
      throw new Error('User or delivery person profile not found.');
    }

    const favorites = user.deliveryPerson.favorites
      .filter((favorite) => favorite.shipment.status !== 'finish')
      .slice((page - 1) * limit, page * limit);

    return favorites.map((favorite) => favorite.shipment);
  }

  async addToFavorites(user_id: string, shipment_id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
      relations: ['deliveryPerson', 'deliveryPerson.favorites'],
    });

    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id: shipment_id },
    });

    if (!user || !user.deliveryPerson || !shipment) {
      throw new Error('User, delivery person profile, or shipment not found.');
    }

    const existingFavorite = user.deliveryPerson.favorites.find(
      (favorite) => favorite.shipment_id === shipment_id,
    );
    if (existingFavorite) {
      throw new Error('Shipment is already in favorites.');
    }

    const favorite = new Favorite();
    favorite.shipment_id = shipment_id;
    favorite.delivery_person_id = user.deliveryPerson.delivery_person_id;
    favorite.shipment = shipment;
    favorite.delivery_person = user.deliveryPerson;

    await this.favoriteRepository.save(favorite);
  }

  async removeFromFavorites(user_id: string, shipment_id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
      relations: ['deliveryPerson'],
    });

    if (!user || !user.deliveryPerson) {
      throw new Error('User or delivery person profile not found.');
    }

    const favorite = await this.favoriteRepository.findOne({
      where: {
        delivery_person_id: user.deliveryPerson.delivery_person_id,
        shipment_id: shipment_id,
      },
    });

    if (!favorite) {
      throw new Error('Favorite not found.');
    }

    await this.favoriteRepository.remove(favorite);

    return { message: 'Favorite removed successfully.' };
  }

  async getDeliveryStatus(deliveryId: string): Promise<{ status: string }> {
    const delivery = await this.deliveryRepository.findOne({
      where: { delivery_id: deliveryId },
    });

    if (!delivery) {
      throw new Error('Delivery not found.');
    }

    return { status: delivery.status };
  }

  async createStepDelivery(
    createDeliveryDto: CreateDeliveryDto,
    updatedAmount: number,
  ): Promise<Delivery> {
    const { shipmentId, deliveryPersonId, warehouseId, newExchangePointData } = createDeliveryDto;

    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id: shipmentId },
      relations: ['stores'],
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const deliveryPerson = await this.deliveryPersonRepository.findOne({
      where: { user: { user_id: deliveryPersonId } },
    });

    if (!deliveryPerson) {
      throw new Error('Delivery person not found');
    }

    let exchangePoint: ExchangePoint;
    if (warehouseId) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { warehouse_id: warehouseId },
      });

      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      exchangePoint = this.exchangePointRepository.create({
        city: warehouse.city,
        coordinates: warehouse.coordinates,
        warehouse,
      });
    } else if (newExchangePointData) {
      exchangePoint = this.exchangePointRepository.create({
        city: newExchangePointData.city,
        coordinates: newExchangePointData.coordinates,
      });
    } else {
      throw new Error('Either warehouseId or newExchangePointData must be provided');
    }

    exchangePoint = await this.exchangePointRepository.save(exchangePoint);

    const lastStep =
      shipment.stores.length > 0 ? Math.max(...shipment.stores.map((store) => store.step)) : 0;
    const newStep = lastStep + 1;

    const store = this.storeRepository.create({
      shipment,
      exchangePoint,
      step: newStep,
      start_date: new Date(),
      end_date: new Date(),
    });

    await this.storeRepository.save(store);

    const delivery = this.deliveryRepository.create({
      shipment,
      delivery_person: deliveryPerson,
      status: 'pending',
      amount: updatedAmount,
      send_date: new Date(),
      shipment_step: newStep,
    });

    return this.deliveryRepository.save(delivery);
  }

  async createNegotiatedDelivery(
    shipmentId: string,
    userId: string,
    updatedAmount: number,
  ): Promise<Delivery> {
    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id: shipmentId },
      relations: ['user'],
    });

    if (!shipment) {
      throw new Error('Shipment not found.');
    }
    if (shipment.user.user_id !== userId) {
      throw new Error('User is not authorized to create a negotiated delivery for this shipment.');
    }

    const delivery = this.deliveryRepository.create({
      send_date: new Date(),
      status: 'pending',
      amount: updatedAmount,
      shipment: shipment,
    });

    const savedDelivery = await this.deliveryRepository.save(delivery);
    await this.shipmentRepository.save(shipment);
    return savedDelivery;
  }

  async deleteShipment(shipmentId: string, user_id: string): Promise<{ message: string }> {
    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id: shipmentId },
      relations: ['user'],
    });

    if (!shipment) {
      throw new Error('Shipment not found.');
    }
    if (shipment.user.user_id !== user_id) {
      throw new Error('User is not authorized to delete this shipment.');
    }

    await this.shipmentRepository.remove(shipment);

    return { message: 'Shipment deleted successfully.' };
  }
}
