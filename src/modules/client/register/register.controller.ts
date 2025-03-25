import { Body, Controller, Get, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { ClientProfile } from "src/common/decorator/client-profile.decorator";
import { ClientProfileGuard } from "src/common/guards/client-profile.guard";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";
import { RegisterClientDTO } from "./dto/register.client.dto";
import { RegisterService } from "./register.service";
import { RegisterMerchantDTO } from "./dto/register.merchant.dto";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage, memoryStorage } from "multer";
import { extname } from "path";
import { RegisterProviderDTO } from "./dto/register.provider.dto";
import { MinioService } from "src/common/services/file/minio.service";


@Controller("client/register")
export class RegisterController {
    constructor(
        private readonly registerService : RegisterService,
        private readonly minioService: MinioService,
    ) {}

    @Post("client")
    async registerClient(@Body() clientDto: RegisterClientDTO) {
        return this.registerService.registerClient(clientDto);
    }

    @Post("merchant")
    async registerMerchant(@Body() merchantDto: RegisterMerchantDTO) {
        return this.registerService.registerMerchant(merchantDto);
    }

    @Post("provider")
    @UseInterceptors(FilesInterceptor('documents', 10, {
      storage: memoryStorage(),
    }))
    async registerProvider(
      @UploadedFiles() files: Array<Express.Multer.File>,
      @Body() registerProviderDto: RegisterProviderDTO,
    ) {
      const documentData: { name: string; provider_document_url: string }[] = [];

      for (const file of files) {
        const filePath = `provider/${registerProviderDto.siret}/documents/${file.originalname}`;

        await this.minioService.uploadFileToBucket('provider-documents', filePath, file);

        documentData.push({
          name: file.originalname,
          provider_document_url: filePath,
        });
      }

      const message = await this.registerService.createProvider(registerProviderDto, documentData);

      return { message };
    }

    @Post("delivery")
    @ClientProfile('CLIENT')
    @UseGuards(ClientJwtGuard, ClientProfileGuard)
    async registerDelivery(){
        return 'register delivery';
    }

  

    @Get('test')
    async test(){
        return this.registerService.test();
    }

}