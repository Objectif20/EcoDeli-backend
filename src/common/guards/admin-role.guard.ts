import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY } from '../decorator/admin-role.decorator';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from '../entities/admin.entity';
import { Role } from '../entities/roles.entity';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(ADMIN_ROLES_KEY, context.getHandler());

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const adminId = request.body?.admin_id;

    if (!adminId) {
      throw new UnauthorizedException('Admin ID non trouvé dans la requête');
    }

    const admin = await this.adminRepository.findOne({ where: { admin_id: adminId } });

    if (!admin) {
      throw new UnauthorizedException('Admin introuvable');
    }

    if (admin.super_admin) {
      return true;
    }

    if (requiredRoles.length === 1 && requiredRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Accès refusé : Vous devez être SUPER_ADMIN');
    }

    const adminRoles = await this.roleRepository.find({
      where: { admin_id: adminId },
      relations: ['role'],
    });

    const userRoles = adminRoles.map((r) => r.role.role_name);

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Accès refusé : rôle insuffisant');
    }

    return true;
  }
}
