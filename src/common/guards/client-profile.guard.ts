import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLIENT_PROFILE_KEY } from '../decorator/client-profile.decorator';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from '../entities/user.entity';
import { Client } from '../entities/client.entity';
import { Merchant } from '../entities/merchant.entity';
import { Providers } from '../entities/provider.entity';
import { DeliveryPerson } from '../entities/delivery_persons.entity';

@Injectable()
export class ClientProfileGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Users) private readonly userRepository: Repository<Users>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(Merchant) private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Providers) private readonly providerRepository: Repository<Providers>,
    @InjectRepository(DeliveryPerson) private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredProfiles = this.reflector.get<string[]>(CLIENT_PROFILE_KEY, context.getHandler());

    if (!requiredProfiles || requiredProfiles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.body?.user_id;

    if (!userId) {
      throw new UnauthorizedException('User ID non trouvé dans la requête');
    }

    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    let hasProfile = false;

    for (const profile of requiredProfiles) {
      switch (profile) {
        case 'CLIENT':
          hasProfile = (await this.clientRepository.count({ where: { user: { user_id: userId } } })) > 0;
          break;
        case 'MERCHANT':
          hasProfile = (await this.merchantRepository.count({ where: { user: { user_id: userId } } })) > 0;
          break;
        case 'PROVIDER':
          hasProfile = (await this.providerRepository.count({ where: { user: { user_id: userId } } })) > 0;
          break;
        case 'DELIVERYMAN':
          hasProfile = (await this.deliveryPersonRepository.count({ where: { user: { user_id: userId } } })) > 0;
          break;
        default:
          break;
      }

      if (hasProfile) {
        return true; 
      }
    }

    throw new ForbiddenException('Accès refusé : rôle insuffisant');
  }
}
