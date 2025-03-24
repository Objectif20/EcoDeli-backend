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
        @Inject('STRIPE_CLIENT') private readonly stripeClient: Stripe,
    ) {}

    async registerClient(clientDto: RegisterClientDTO): Promise<{ message: string }> {
        const { email, password, last_name, first_name, newsletter, stripe_temp_key, language_id } = clientDto;
    
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
    
        let stripe_customer_id;
        try {
          const customer = await this.stripeClient.customers.create({
            email: email,
            description: `Client: ${first_name} ${last_name}`,
          });
          stripe_customer_id = customer.id;
        } catch (error) {
          throw new BadRequestException('Erreur lors de la création du client Stripe');
        }
    
        const newClient = this.clientRepository.create({
          last_name: last_name,
          first_name: first_name,
          stripe_customer_id: stripe_customer_id,
          user: savedUser,
        });
    
        await this.clientRepository.save(newClient);
    
        return { message: 'Utilisateur inscrit avec succès' };
    }
}
