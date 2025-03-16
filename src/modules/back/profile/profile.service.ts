import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { Repository } from "typeorm";
import * as nodemailer from 'nodemailer';
import { AdminProfile } from "./types";
import { MinioService } from "src/common/services/file/minio.service";
import { v4 as uuidv4 } from 'uuid';
import { UpdateRoleDto } from "./dto/update-role.dto";
import { Role } from "src/common/entities/roles.entity";
import { RoleList } from "src/common/entities/role_list.entity";
import { CreateProfileDto } from "./dto/create-profile.dto";



@Injectable()
export class AdminProfileService {
    

    constructor(
        @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(RoleList) private readonly roleListRepository: Repository<RoleList>,
        @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
        private readonly minioService: MinioService,
    )    
    {}

    async getAllProfile(): Promise<Partial<Admin>[]> {
        const admins = await this.adminRepository.find({
            select: ['admin_id', 'last_name', 'first_name', 'email', 'active', 'photo'],
        });
    
        for (const admin of admins) {
            if (admin.photo) {
                const bucketName = 'admin-images';
                const imageName = admin.photo.split('admin/')[1];
                admin.photo = await this.minioService.generateImageUrl(bucketName, imageName);
            }
        }
    
        return admins;
    }
    
    async getMyProfile(admin_id: string): Promise<AdminProfile> {
        const adminRows = await this.adminRepository
            .createQueryBuilder('admin')
            .leftJoin('roles', 'role', 'role.admin_id = admin.admin_id')
            .leftJoin('roles_list', 'roleList', 'role.role_id = roleList.role_id')
            .where('admin.admin_id = :admin_id', { admin_id })
            .select([
                'admin.admin_id AS admin_id',
                'admin.last_name AS last_name',
                'admin.first_name AS first_name',
                'admin.email AS email',
                'admin.active AS active',
                'admin.photo AS photo',
                'roleList.role_name AS role_name'
            ])
            .getRawMany();
    
        if (!adminRows || adminRows.length === 0) {
            throw new Error('Admin not found');
        }
    
        const adminInfo = adminRows[0];
        const roles = [...new Set(adminRows.map(row => row.role_name).filter(role => role !== null))];
    
        let photoUrl = adminInfo.photo;
        if (adminInfo.photo) {
            const bucketName = 'admin-images';
            const imageName = adminInfo.photo.split('admin/')[1];
            photoUrl = await this.minioService.generateImageUrl(bucketName, imageName);
        }
    
        return {
            admin_id: adminInfo.admin_id,
            last_name: adminInfo.last_name,
            first_name: adminInfo.first_name,
            email: adminInfo.email,
            active: adminInfo.active,
            photo: photoUrl,
            roles,
        };
    }
    
    async getProfileById(admin_id: string): Promise<Partial<Admin>> {
        const admin = await this.adminRepository.findOne({
            where: { admin_id },
            select: ['admin_id', 'last_name', 'first_name', 'email', 'active', 'photo'],
        });
        if (!admin) {
            throw new Error('Admin not found');
        }
    
        if (admin.photo) {
            const bucketName = 'admin-images';
            const imageName = admin.photo.split('admin/')[1];
            admin.photo = await this.minioService.generateImageUrl(bucketName, imageName);
        }
    
        return admin;
    }
    


    async updateProfile(admin_id: string, admin: Partial<Admin>, file?: Express.Multer.File): Promise<Partial<Admin>> {
        if (file) {
            const filename = `${uuidv4()}.png`;
            const filePath = `admin/${admin_id}/images/${filename}`;
    
            const uploadSuccess = await this.minioService.uploadFileToBucket('admin-images', filePath, file);
            if (!uploadSuccess) {
                throw new Error('Failed to upload the image');
            }
    
            admin.photo = filePath;
        }
    
        if (!admin.photo && Object.keys(admin).length === 0) {
            throw new Error('No data provided for update');
        }
    
        const result = await this.adminRepository.update({ admin_id }, admin);
        if (result.affected === 0) {
            throw new Error('Admin not found');
        }
    
        const updatedAdminProfile = await this.getProfileById(admin_id);
    
        if (admin.photo) {
            const bucketName = 'admin-images';
            const imageName = admin.photo.split('admin/')[1]; 
            const imageUrl = await this.minioService.generateImageUrl(bucketName, imageName);
            updatedAdminProfile.photo = imageUrl;  
        }
    
        return updatedAdminProfile;
    }


    async updateRole(admin_id: string, updateRoleDto: UpdateRoleDto): Promise<{ message: string }> {
        const { roles } = updateRoleDto;
    
        const admin = await this.adminRepository.findOne({ where: { admin_id } });
        if (!admin) {
            throw new Error('Admin not found');
        }
    
        const roleEntities = await this.roleListRepository
            .createQueryBuilder('roleList')
            .where('roleList.role_name IN (:...roles)', { roles })
            .getMany();
    
        if (roleEntities.length !== roles.length) {
            throw new Error('One or more roles are invalid.');
        }
    
        await this.roleRepository.delete({ admin_id });
    
        const newRoles = roleEntities.map(role => ({
            admin_id,
            role_id: role.role_id
        }));
    
        await this.roleRepository
            .createQueryBuilder()
            .insert()
            .into(Role)
            .values(newRoles)
            .execute();
    
        return { message: 'Roles successfully updated' };
    }
    

    async createProfile(createProfileDto: CreateProfileDto): Promise<AdminProfile> {
        const { first_name, last_name, email, roles } = createProfileDto;
        
        const existingAdmin = await this.adminRepository.findOne({ where: { email } });
        if (existingAdmin) {
            throw new Error('An account with this email already exists.');
        }
        
        const passwordCode = uuidv4(); 
    
        const newAdmin = this.adminRepository.create({
            first_name,
            last_name,
            email,
            active: true,
            password_code: passwordCode,
        });
    
        const savedAdmin = await this.adminRepository.save(newAdmin);
    
        const roleEntities = await this.roleListRepository
            .createQueryBuilder('roleList')
            .where('roleList.role_name IN (:...roles)', { roles: roles })
            .getMany();
    
        if (roleEntities.length !== roles.length) {
            throw new Error('One or more roles are invalid.');
        }
    
        const rolesToAssign = roleEntities.map(roleEntity => ({
            admin_id: savedAdmin.admin_id,
            role_id: roleEntity.role_id
        }));
    
        await this.roleRepository
            .createQueryBuilder()
            .insert()
            .into(Role)
            .values(rolesToAssign)
            .execute();
    
        try {
            const fromEmail = this.mailer.options.auth.user;
            await this.mailer.sendMail({
                from: fromEmail,
                to: email,
                subject: 'Création d\'un compte administrateur',
                text: `Bonjour ${first_name},\n\nVotre compte a été créé avec succès.\n\nPour définir votre mot de passe, utilisez le code suivant : ${passwordCode}\n\nMerci !`,
            });
        } catch (error) {
            throw new Error(`Error sending the email: ${error.message}`);
        }
    
        const adminProfile = await this.getMyProfile(savedAdmin.admin_id);
        return adminProfile;
    }

    async newPassword(admin_id: string): Promise<{ message: string }> {
        const admin = await this.adminRepository.findOne({ where: { admin_id } });
        if (!admin) throw new UnauthorizedException('User not found');
      
        const passwordCode = uuidv4(); 
      
        admin.password_code = passwordCode;
        await this.adminRepository.save(admin);
      
        try {
          const fromEmail = this.mailer.options.auth.user;
          const info = await this.mailer.sendMail({
            from: fromEmail,
            to: admin.email,
            subject: 'Réinitialisation de mot de passe',
            text: 'Voici votre code temporaire pour réinitialiser votre mot de passe: ' + passwordCode,
          });
        } catch (error) {
          throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
        }
    
        return { message: 'Email sent' };
      }


    
}
