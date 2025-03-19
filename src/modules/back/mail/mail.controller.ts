import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { MailService } from "./mail.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminRole } from "src/common/decorator/admin-role.decorator";
import { AdminJwtGuard } from "src/common/guards/admin-jwt.guard";
import { AdminRoleGuard } from "src/common/guards/admin-role.guard";


@Controller('admin/email')
export class MailController {

    constructor(
        private readonly mailservice: MailService,
    ) { }

    @Post('upload')
    @AdminRole('MAIL')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @UseInterceptors(FileInterceptor('photo'))
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ url: string } | { error: string }> {
        return await this.mailservice.uploadPicture(file);
    }

}