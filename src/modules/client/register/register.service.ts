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
import stripe from "stripe";

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
        @Inject('STRIPE_CLIENT') private readonly stripeClient: Stripe,
    ) {}

    async registerClient(clientDto: RegisterClientDTO): Promise<{ message: string }> {
      const { email, password, last_name, first_name, newsletter, stripe_temp_key, language_id, plan_id } = clientDto;
    
      // Vérifiez si l'utilisateur existe déjà
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    
      // Vérifiez si la langue est valide
      const language = await this.languageRepository.findOne({ where: { language_id: language_id } });
      if (!language) {
        throw new BadRequestException('Langue non valide');
      }
    
      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);
    
      // Vérifiez si le thème par défaut existe
      const defaultTheme = await this.themeRepository.findOne({ where: { theme_id: 1 } });
      if (!defaultTheme) {
        throw new BadRequestException("Le thème par défaut (id=1) est introuvable.");
      }
    
      // Création d'un nouvel utilisateur
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
              plan_obj: plan,
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
    



    async test(){
      const paymentMethod = await this.stripeClient.paymentMethods.retrieve('pm_1R6d6t2Yjtdc4SmmCHmruGJb');
      console.log(paymentMethod);

    }
}

