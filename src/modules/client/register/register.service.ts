import { Injectable, ConflictException, BadRequestException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { RegisterClientDTO } from "./dto/register.client.dto";
import { Users } from "src/common/entities/user.entity";
import { Client } from "src/common/entities/client.entity";
import { Languages } from "src/common/entities/languages.entity";
import { Themes } from "src/common/entities/theme.entity";
import Stripe from "stripe";
import { Subscription } from "src/common/entities/subscription.entity";
import { Plan } from "src/common/entities/plan.entity";
import { DefaultApi as OneSignalClient } from '@onesignal/node-onesignal';
import { RegisterMerchantDTO } from "./dto/register.merchant.dto";
import { Merchant } from "src/common/entities/merchant.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { Providers } from "src/common/entities/provider.entity";
import { RegisterProviderDTO } from "./dto/register.provider.dto";
import { ProviderContracts } from "src/common/entities/providers_contracts.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import * as PDFDocument from 'pdfkit';
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { DeliveryPersonDocument } from "src/common/entities/delivery_person_documents.entity";
import { Vehicle } from "src/common/entities/vehicle.entity";
import { VehicleDocument } from "src/common/entities/vehicle_documents.entity";
import { Category } from "src/common/entities/category.entity";
import { RegisterDeliveryPersonDTO } from "./dto/register.delivery.dto";
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { StripeService } from "src/common/services/stripe/stripe.service";


@Injectable()
export class RegisterService {
    constructor(
        @InjectRepository(Users)
        private readonly userRepository: Repository<Users>,
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,
        @InjectRepository(Languages)
        private readonly languageRepository: Repository<Languages>,
        @InjectRepository(Themes)
        private readonly themeRepository: Repository<Themes>,
        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,
        @InjectRepository(Plan)
        private readonly planRepository: Repository<Plan>,
        @InjectRepository(Merchant)
        private readonly merchantRepository: Repository<Merchant>,
        @InjectRepository(Providers)
        private readonly providersRepository: Repository<Providers>,
        @InjectRepository(ProviderContracts)
        private readonly providerContractsRepository: Repository<ProviderContracts>,
        @InjectRepository(ProviderDocuments)
        private readonly providerDocumentsRepository: Repository<ProviderDocuments>,
        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
        @InjectRepository(DeliveryPersonDocument)
        private readonly deliveryPersonDocumentRepository: Repository<DeliveryPersonDocument>,
        @InjectRepository(Vehicle)
        private readonly vehicleRepository: Repository<Vehicle>,
        @InjectRepository(VehicleDocument)
        private readonly vehicleDocumentRepository: Repository<VehicleDocument>,
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
        @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
        private readonly minioService: MinioService,
        private readonly stripeService: StripeService,
    ) {}

    async registerClient(clientDto: RegisterClientDTO): Promise<{ message: string }> {
      const { email, password, last_name, first_name, newsletter, stripe_temp_key, language_id, plan_id } = clientDto;
    
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    
      const language = await this.languageRepository.findOne({ where: { language_id } });
      if (!language) {
        throw new BadRequestException('Langue non valide');
      }
    
      const hashedPassword = await bcrypt.hash(password, 10);
    
      const defaultTheme = await this.themeRepository.findOne({ where: { theme_id: 1 } });
      if (!defaultTheme) {
        throw new BadRequestException("Le thème par défaut (id=1) est introuvable.");
      }
    
      const newUser = this.userRepository.create({
        email,
        password: hashedPassword,
        newsletter,
        confirmed: false,
        language,
        theme: defaultTheme,
      });
    
      const savedUser = await this.userRepository.save(newUser);
    
      let stripeCustomerId: string | null = null;
    
      if (stripe_temp_key) {
        try {
          const customer = await this.stripeService.createCustomer(email, `Client: ${first_name} ${last_name}`);
          await this.stripeService.attachPaymentMethod(customer.id, stripe_temp_key);
          stripeCustomerId = customer.id;
        } catch (error) {
          console.log(error);
          throw new BadRequestException('Erreur lors de l\'attachement du paymentMethod au client Stripe', error);
        }
      }
    
      const newClient = this.clientRepository.create({
        last_name,
        first_name,
        stripe_customer_id: stripeCustomerId ?? null,
        user: savedUser,
      });
    
      await this.clientRepository.save(newClient);
    
      if (plan_id && stripeCustomerId) {
        const plan = await this.planRepository.findOne({ where: { plan_id } });
        if (plan && plan.stripe_product_id && plan.stripe_price_id && (plan.price ?? 0) > 0) {
          try {
            const subscription = await this.stripeService.createSubscription(stripeCustomerId, plan.stripe_price_id);
    
            const newSubscription = this.subscriptionRepository.create({
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              start_date: new Date(subscription.current_period_start * 1000),
              end_date: new Date(subscription.current_period_end * 1000),
              user: savedUser,
              plan,
            });
    
            await this.subscriptionRepository.save(newSubscription);
          } catch (error) {
            console.log(error);
            throw new BadRequestException('Erreur lors de la création de l\'abonnement Stripe');
          }
        }
      }
    
      const validateCode = uuidv4();
    
      const savedValidateCode = await this.userRepository.save({
        user_id: savedUser.user_id,
        validate_code: validateCode,
      });
    
      if (!savedValidateCode) {
        throw new BadRequestException('Erreur lors de la génération du code de validation');
      }
      const urlWithCode = `${process.env.OFFICIAL_WEBSITE}/auth/validate/${validateCode}`;
      try {
        const fromEmail = this.mailer.options.auth.user;
        await this.mailer.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Valider votre compte',
          text: 'Voici le lien pour valider votre compte :' + urlWithCode,
        });
      } catch (error) {
        throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
      }
    
      return { message: 'Utilisateur inscrit avec succès' };
    }
    

    async registerMerchant(merchantDto: RegisterMerchantDTO): Promise<{ message: string }> {
      const { email, password, company_name, siret, address, description, postal_code, city, country, phone, newsletter, stripe_temp_key, language_id, plan_id } = merchantDto;

      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Cet email est déjà utilisé');
      }

      const language = await this.languageRepository.findOne({ where: { language_id } });
      if (!language) {
        throw new BadRequestException('Langue non valide');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const defaultTheme = await this.themeRepository.findOne({ where: { theme_id: 1 } });
      if (!defaultTheme) {
        throw new BadRequestException("Le thème par défaut (id=1) est introuvable.");
      }

      const newUser = this.userRepository.create({
        email,
        password: hashedPassword,
        newsletter,
        confirmed: false,
        language,
        theme: defaultTheme,
      });

      const savedUser = await this.userRepository.save(newUser);

      let stripeCustomerId: string | null = null;

      if (stripe_temp_key) {
        try {
          const customer = await this.stripeService.createCustomer(email, `Commerçant: ${company_name}`);
          await this.stripeService.attachPaymentMethod(customer.id, stripe_temp_key);
          stripeCustomerId = customer.id;
        } catch (error) {
          console.log(error);
          throw new BadRequestException('Erreur lors de l\'attachement du paymentMethod au commerçant Stripe', error);
        }
      }

      const newMerchant = this.merchantRepository.create({
        company_name,
        siret,
        address,
        description,
        postal_code,
        city,
        country,
        phone,
        first_name: merchantDto.firstName,
        last_name: merchantDto.lastName,
        stripe_customer_id: stripeCustomerId ?? null,
        user: savedUser,
        contract_url: null,
      });

      const savedMerchant = await this.merchantRepository.save(newMerchant);

      try {
        const contratUrl = await this.contractMerchant({
          company_name,
          siret,
          address,
          postal_code,
          city,
          country,
          phone,
          last_name: merchantDto.lastName,
          first_name: merchantDto.firstName,
          user: savedUser,
        }, merchantDto.signature);

        savedMerchant.contract_url = contratUrl;
        await this.merchantRepository.save(savedMerchant);
      } catch (error) {
        console.log('Erreur lors de la génération du contrat:', error);
        throw new BadRequestException('Erreur lors de la génération du contrat PDF');
      }

      if (plan_id && stripeCustomerId) {
        const plan = await this.planRepository.findOne({ where: { plan_id } });
        if (plan && plan.stripe_product_id && plan.stripe_price_id && (plan.price ?? 0) > 0) {
          try {
            const subscription = await this.stripeService.createSubscription(stripeCustomerId, plan.stripe_price_id);

            const newSubscription = this.subscriptionRepository.create({
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              start_date: new Date(subscription.current_period_start * 1000),
              end_date: new Date(subscription.current_period_end * 1000),
              user: savedUser,
              plan,
            });

            await this.subscriptionRepository.save(newSubscription);
          } catch (error) {
            console.log(error);
            throw new BadRequestException('Erreur lors de la création de l\'abonnement Stripe');
          }
        }
      }

      const validateCode = uuidv4();

      const savedValidateCode = await this.userRepository.save({
        user_id: savedUser.user_id,
        validate_code: validateCode,
      });

      if (!savedValidateCode) {
        throw new BadRequestException('Erreur lors de la génération du code de validation');
      }
      const urlWithCode = `${process.env.OFFICIAL_WEBSITE}/auth/validate/${validateCode}`;

      try {
        const fromEmail = this.mailer.options.auth.user;
        await this.mailer.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Valider votre compte',
          text: 'Voici le lien pour valider votre compte : ' + urlWithCode,
        });
      } catch (error) {
        throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
      }

      return { message: 'Commerçant inscrit avec succès' };
    }

    async createProvider(registerProviderDto: RegisterProviderDTO, documentData: { name: string; provider_document_url: string }[]): Promise<{ message: string }> {
      const { email, password, company_name, siret, address, service_type, description, postal_code, city, country, phone, newsletter, language_id, last_name, first_name, signature } = registerProviderDto;

      const hashedPassword = await bcrypt.hash(password, 10);

      const language = await this.languageRepository.findOne({ where: { language_id: language_id } });
      if (!language) {
        throw new BadRequestException('Langue non valide');
      }

      const defaultTheme = await this.themeRepository.findOne({ where: { theme_id: 1 } });
        if (!defaultTheme) {
          throw new BadRequestException("Le thème par défaut (id=1) est introuvable.");
        }

      const newsletterValue = newsletter === 'true';

      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        newsletter : newsletterValue,
        confirmed: false,
        language,
        theme: defaultTheme,
      });

      const savedUser = await this.userRepository.save(user);

      const provider = this.providersRepository.create({
        company_name,
        siret,
        address,
        service_type,
        description,
        postal_code,
        city,
        country,
        phone,
        validated: false,
        last_name,
        first_name,
        user: savedUser,
        documents: documentData.map(doc => ({ ...doc, submission_date: new Date() })),
      });

      const savedProvider = await this.providersRepository.save(provider);

      for (const doc of documentData) {
        const providerDocument = this.providerDocumentsRepository.create({
          ...doc,
          provider: savedProvider,
        });
        await this.providerDocumentsRepository.save(providerDocument);
      }

      const contractUrl = await this.generateProviderContractPdf(savedProvider, signature);

      const providerContract = this.providerContractsRepository.create({
        company_name: savedProvider.company_name,
        siret: savedProvider.siret,
        address: savedProvider.address,
        contract_url: contractUrl,
        provider: savedProvider,
        created_at: new Date(),
      });

      await this.providerContractsRepository.save(providerContract);

      const validateCode = uuidv4();

      const savedValidateCode = await this.userRepository.save({
        user_id: savedUser.user_id,
        validate_code: validateCode,
      });

      if (!savedValidateCode) {
        throw new BadRequestException('Erreur lors de la génération du code de validation');
      }

      const urlWithCode = `${process.env.OFFICIAL_WEBSITE}/auth/validate/${validateCode}`;

      try {
        const fromEmail = this.mailer.options.auth.user;
        await this.mailer.sendMail({
          from: fromEmail,
          to: email,
          subject: 'Valider votre compte',
          text: 'Voici le lien pour valider votre compte :' + urlWithCode,
        });
      } catch (error) {
        throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
      }

      return { message: 'Fournisseur enregistré avec succès' };
    }

    async contractMerchant(merchant: any, imageBase64?: string): Promise<string> {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `contract-${merchant.merchant_id}.pdf`;
      const filePath = `merchant/${merchant.siret}/contracts/${fileName}`;

      doc.fontSize(20).text('Contrat de Services Marchand', { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text(`Entreprise: ${merchant.company_name}`);
      doc.fontSize(14).text(`SIRET: ${merchant.siret}`);
      doc.fontSize(14).text(`Adresse: ${merchant.address}, ${merchant.postal_code} ${merchant.city}, ${merchant.country}`);
      doc.moveDown();

      doc.fontSize(14).text(`Contact: ${merchant.last_name} ${merchant.first_name}`);
      doc.moveDown();

      doc.fontSize(14).text('Le marchand accepte les conditions générales d’utilisation de la plateforme.');
      doc.moveDown();

      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imageBuffer, {
          fit: [100, 100],
          align: 'right',
          valign: 'bottom'
        });
      }

      const now = new Date();
      const options = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" } as Intl.DateTimeFormatOptions;
      const timestamp = now.toLocaleDateString('fr-FR', options);
      doc.fontSize(12).text(`Signé électroniquement le ${timestamp}`, { align: 'right' });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      new Promise<string>((resolve) => {
        doc.on('end', async () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('Uploading contract to Minio ' + filePath);
          await this.minioService.uploadBufferToBucket('client-documents', filePath, pdfBuffer);
          resolve(filePath);
        });
      });

      doc.end();
      return filePath;
    }

  
    async generateProviderContractPdf(provider: Providers, imageBase64?: string): Promise<string> {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `contract-${provider.provider_id}.pdf`;
      const filePath = `provider/${provider.siret}/contracts/${fileName}`;
    
      doc.fontSize(20).text('Contrat de Prestation de Services', { align: 'center' });
      doc.moveDown();
    
      doc.fontSize(14).text(`Nom: ${provider.last_name}`);
      doc.fontSize(14).text(`Prénom: ${provider.first_name}`);
      doc.fontSize(14).text(`Entreprise: ${provider.company_name}`);
      doc.fontSize(14).text(`SIRET: ${provider.siret}`);
      doc.fontSize(14).text(`Adresse: ${provider.address}, ${provider.postal_code} ${provider.city}, ${provider.country}`);
      doc.moveDown();
    
      doc.fontSize(14).text('Le prestataire accepte que ses données soient étudiées par EcoDeli afin de valider ou non son accès à la plateforme.');
      doc.moveDown();
    
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imageBuffer, {
          fit: [100, 100],
          align: 'right',
          valign: 'bottom'
        });
      }
    
      const now = new Date();
      const options = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" } as Intl.DateTimeFormatOptions;
      const timestamp = now.toLocaleDateString('fr-FR', options);
      doc.fontSize(12).text(`Signé électroniquement le ${timestamp}`, { align: 'right' });
    
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('Uploading contract to Minio ' + filePath);
        await this.minioService.uploadBufferToBucket('provider-documents', filePath, pdfBuffer);
      });
    
      doc.end();
      return filePath;
    }


    async createDeliveryPerson(registerDeliveryPersonDto: RegisterDeliveryPersonDTO, deliveryPersonFiles: Array<Express.Multer.File>, user_id : string): Promise<{ message: string }> {
      const { license, professional_email, phone_number, country, city, address, postal_code, language_id, signature } = registerDeliveryPersonDto;
    
      const language = await this.languageRepository.findOne({ where: { language_id: language_id } });
      if (!language) {
        throw new BadRequestException('Langue non valide');
      }
    
      const user = await this.userRepository.findOne({ where: { user_id } });
      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }
    
      const deliveryPerson = this.deliveryPersonRepository.create({
        license,
        professional_email,
        phone_number,
        country,
        city,
        address,
        postal_code,
        validated: false,
        status: 'pending',
        user,
      });
    
      const savedDeliveryPerson = await this.deliveryPersonRepository.save(deliveryPerson);
    
      for (const file of deliveryPersonFiles) {
        const filePath = `delivery-person/${savedDeliveryPerson.delivery_person_id}/documents/${file.originalname}`;
        await this.minioService.uploadFileToBucket('client-documents', filePath, file);
    
        const deliveryPersonDocument = this.deliveryPersonDocumentRepository.create({
          name: file.originalname,
          document_url: filePath,
          delivery_person: savedDeliveryPerson,
        });
        await this.deliveryPersonDocumentRepository.save(deliveryPersonDocument);
      }
    
      const contractUrl = await this.generateDeliveryPersonContractPdf(savedDeliveryPerson, signature);
    
      const deliveryPersonContract = this.deliveryPersonDocumentRepository.create({
        name: 'Contrat de profil livreur',
        delivery_person: savedDeliveryPerson,
        document_url: contractUrl,
        contact : true,
      });
    
      await this.deliveryPersonDocumentRepository.save(deliveryPersonContract);
    
      return { message: 'Livreur enregistré avec succès' };
    }

    async generateDeliveryPersonContractPdf(deliveryPerson: DeliveryPerson, signature?: string): Promise<string> {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `contract-${deliveryPerson.delivery_person_id}.pdf`;
      const filePath = `delivery-person/${deliveryPerson.delivery_person_id}/contracts/${fileName}`;
    
      const client = await this.clientRepository.findOne({ where: { user: { user_id: deliveryPerson.user.user_id } } });
    
      if (!client) {
        throw new BadRequestException('Client non trouvé');
      }
    
      doc.fontSize(20).text('Contrat de Livraison', { align: 'center' });
      doc.moveDown();
    
      doc.fontSize(14).text(`Nom: ${client.last_name}`);
      doc.fontSize(14).text(`Prénom: ${client.first_name}`);
      doc.fontSize(14).text(`Email Professionnel: ${deliveryPerson.professional_email}`);
      doc.fontSize(14).text(`Numéro de Téléphone: ${deliveryPerson.phone_number}`);
      doc.fontSize(14).text(`Adresse: ${deliveryPerson.address}, ${deliveryPerson.postal_code} ${deliveryPerson.city}, ${deliveryPerson.country}`);
      doc.fontSize(14).text(`Numéro de Permis: ${deliveryPerson.license}`);
      doc.moveDown();
    
      doc.fontSize(14).text('Le livreur accepte que ses données soient étudiées par EcoDeli afin de valider ou non son accès à la plateforme.');
      doc.moveDown();
    
      if (signature) {
        const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imageBuffer, {
          fit: [100, 100],
          align: 'right',
          valign: 'bottom'
        });
      }
    
      const now = new Date();
      const options = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" } as Intl.DateTimeFormatOptions;
      const timestamp = now.toLocaleDateString('fr-FR', options);
      doc.fontSize(12).text(`Signé électroniquement le ${timestamp}`, { align: 'right' });
    
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('Uploading contract to Minio ' + filePath);
        await this.minioService.uploadBufferToBucket('client-documents', filePath, pdfBuffer);
      });
    
      doc.end();
      return filePath;
    }

    async getSubscriptionStats() {
        const plans = await this.planRepository.find();

        return plans.map(plan => ({
            plan_id: plan.plan_id,
            name: plan.name,
            price: plan.price,
            priority_shipping_percentage: plan.priority_shipping_percentage,
            priority_months_offered: plan.priority_months_offered,
            max_insurance_coverage: plan.max_insurance_coverage,
            extra_insurance_price: plan.extra_insurance_price,
            shipping_discount: plan.shipping_discount,
            permanent_discount: plan.permanent_discount,
            permanent_discount_percentage: plan.permanent_discount_percentage,
            small_package_permanent_discount: plan.small_package_permanent_discount,
            first_shipping_free: plan.first_shipping_free,
            first_shipping_free_threshold: plan.first_shipping_free_threshold,
            is_pro: plan.is_pro,
        }));
    }

    async getLanguage(): Promise<{ language_id: string, language_name: string, iso_code: string, active: boolean }[]> {
        const languages = await this.languageRepository.find();
        return languages.map(language => ({
            language_id: language.language_id,
            language_name: language.language_name,
            iso_code: language.iso_code,
            active: language.active,
        }));
    }


    async isEmailUserUnique(email: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { email } });
        return !user;
    }

    async isSiretUnique(siret: string): Promise<boolean> {
      const provider = await this.providersRepository.findOne({ where: { siret } });
      const merchant = await this.merchantRepository.findOne({ where: { siret } });
      const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { license: siret } });
      return !provider && !merchant && !deliveryPerson;
    }

    async emailDeliveryPersonExists(email: string): Promise<boolean> {
      const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { professional_email: email } });
      return !!deliveryPerson;
    }



}

