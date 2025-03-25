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
        @Inject('STRIPE_CLIENT') private readonly stripeClient: Stripe,
        @Inject("ONESIGNAL_CLIENT") private readonly oneSignalClient: OneSignalClient,
        private readonly minioService: MinioService,
    ) {}

    async registerClient(clientDto: RegisterClientDTO): Promise<{ message: string }> {
      const { email, password, last_name, first_name, newsletter, stripe_temp_key, language_id, plan_id } = clientDto;
    
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    
      const language = await this.languageRepository.findOne({ where: { language_id: language_id } });
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

      let stripeCustomerId;
      try {
        const customer = await this.stripeClient.customers.create({
          email: email,
          description: `Client: ${first_name} ${last_name}`,
        });
    
        const paymentMethods = await this.stripeClient.paymentMethods.list({
          customer: customer.id,
          type: 'card',
        });
    
        const isAttached = paymentMethods.data.some(pm => pm.id === stripe_temp_key);
        if (isAttached) {
          throw new BadRequestException('Le PaymentMethod est déjà attaché à un autre client.');
        }
    
        await this.stripeClient.paymentMethods.attach(stripe_temp_key, {
          customer: customer.id,
        });
    
        await this.stripeClient.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: stripe_temp_key,
          },
        });
    
        stripeCustomerId = customer.id;
      } catch (error) {
        console.log(error);
        throw new BadRequestException('Erreur lors de l\'attachement du paymentMethod au client Stripe', error);
      }
    
      const newClient = this.clientRepository.create({
        last_name: last_name,
        first_name: first_name,
        stripe_customer_id: stripeCustomerId,
        user: savedUser,
      });
    
      await this.clientRepository.save(newClient);
    
      if (plan_id) {
        const plan = await this.planRepository.findOne({ where: { plan_id: plan_id } });
        if (plan && plan.stripe_product_id && plan.stripe_price_id) {
          try {
            console.log('ID du produit/prix:', plan.stripe_price_id);
    
            const subscription = await this.stripeClient.subscriptions.create({
              customer: stripeCustomerId,
              items: [{ price: plan.stripe_price_id }],
            });
    
            const newSubscription = this.subscriptionRepository.create({
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              start_date: new Date(subscription.current_period_start * 1000),
              end_date: new Date(subscription.current_period_end * 1000),
              user: savedUser,
              plan: plan,
            });
    
            await this.subscriptionRepository.save(newSubscription);
          } catch (error) {
            console.log(error);
            throw new BadRequestException('Erreur lors de la création de l\'abonnement Stripe');
          }
        }
      }
    
      return { message: 'Utilisateur inscrit avec succès' };
    }

    async registerMerchant(merchantDto: RegisterMerchantDTO): Promise<{ message: string }> {
      const { email, password, company_name, siret, address, description, postal_code, city, country, phone, newsletter, stripe_temp_key, language_id, plan_id } = merchantDto;
  
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
          throw new ConflictException('Cet email est déjà utilisé');
      }
  
      const language = await this.languageRepository.findOne({ where: { language_id: language_id } });
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
  
      let stripeCustomerId;
      try {
          const customer = await this.stripeClient.customers.create({
              email: email,
              description: `Commerçant: ${company_name}`,
          });
  
          const paymentMethods = await this.stripeClient.paymentMethods.list({
              customer: customer.id,
              type: 'card',
          });
  
          const isAttached = paymentMethods.data.some(pm => pm.id === stripe_temp_key);
          if (isAttached) {
              throw new BadRequestException('Le PaymentMethod est déjà attaché à un autre commerçant.');
          }
  
          await this.stripeClient.paymentMethods.attach(stripe_temp_key, {
              customer: customer.id,
          });
  
          await this.stripeClient.customers.update(customer.id, {
              invoice_settings: {
                  default_payment_method: stripe_temp_key,
              },
          });
  
          stripeCustomerId = customer.id;
      } catch (error) {
          console.log(error);
          throw new BadRequestException('Erreur lors de l\'attachement du paymentMethod au commerçant Stripe', error);
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
          stripe_customer_id: stripeCustomerId,
          user: savedUser,
      });
  
      await this.merchantRepository.save(newMerchant);
  
      if (plan_id) {
          const plan = await this.planRepository.findOne({ where: { plan_id: plan_id } });
          if (plan && plan.stripe_product_id && plan.stripe_price_id) {
              try {
                  console.log('ID du produit/prix:', plan.stripe_price_id);
  
                  const subscription = await this.stripeClient.subscriptions.create({
                      customer: stripeCustomerId,
                      items: [{ price: plan.stripe_price_id }],
                  });
  
                  const newSubscription = this.subscriptionRepository.create({
                      stripe_customer_id: stripeCustomerId,
                      stripe_subscription_id: subscription.id,
                      status: subscription.status,
                      start_date: new Date(subscription.current_period_start * 1000),
                      end_date: new Date(subscription.current_period_end * 1000),
                      user: savedUser,
                      plan: plan,
                  });
  
                  await this.subscriptionRepository.save(newSubscription);
              } catch (error) {
                  console.log(error);
                  throw new BadRequestException('Erreur lors de la création de l\'abonnement Stripe');
              }
          }
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

      const contractUrl = await this.generateContractPdf(savedProvider, signature);

      const providerContract = this.providerContractsRepository.create({
        company_name: savedProvider.company_name,
        siret: savedProvider.siret,
        address: savedProvider.address,
        contract_url: contractUrl,
        provider: savedProvider,
      });

      await this.providerContractsRepository.save(providerContract);

      return { message: 'Fournisseur enregistré avec succès' };
    }

  
    async generateContractPdf(provider: Providers, imageBase64?: string): Promise<string> {
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


    async test(){
      const paymentMethod = await this.stripeClient.paymentMethods.retrieve('pm_1R6d6t2Yjtdc4SmmCHmruGJb');
      console.log(paymentMethod);

    }
}

