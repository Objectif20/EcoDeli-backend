import { Body, Controller, Get, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { ClientProfile } from "src/common/decorator/client-profile.decorator";
import { ClientProfileGuard } from "src/common/guards/client-profile.guard";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";
import { RegisterClientDTO } from "./dto/register.client.dto";
import { RegisterService } from "./register.service";
import { RegisterMerchantDTO } from "./dto/register.merchant.dto";
import { AnyFilesInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { RegisterProviderDTO } from "./dto/register.provider.dto";
import { MinioService } from "src/common/services/file/minio.service";
import { RegisterDeliveryPersonDTO } from "./dto/register.delivery.dto";

@ApiTags('Registration')
@Controller("client/register")
export class RegisterController {
    constructor(
        private readonly registerService: RegisterService,
        private readonly minioService: MinioService,
    ) {}

    @Post("client")
    @ApiOperation({
        summary: 'Register a Client',
        operationId: 'registerClient',
    })
    @ApiBody({ type: RegisterClientDTO })
    @ApiResponse({ status: 201, description: 'Client registered successfully' })
    async registerClient(@Body() clientDto: RegisterClientDTO) {
        return this.registerService.registerClient(clientDto);
    }

    @Post("merchant")
    @ApiOperation({
        summary: 'Register a Merchant',
        operationId: 'registerMerchant',
    })
    @ApiBody({ type: RegisterMerchantDTO })
    @ApiResponse({ status: 201, description: 'Merchant registered successfully' })
    async registerMerchant(@Body() merchantDto: RegisterMerchantDTO) {
        return this.registerService.registerMerchant(merchantDto);
    }

    @Post("provider")
    @ApiOperation({
        summary: 'Register a Provider',
        operationId: 'registerProvider',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: RegisterProviderDTO })
    @UseInterceptors(FilesInterceptor('documents', 10, {
      storage: memoryStorage(),
    }))
    @ApiResponse({ status: 201, description: 'Provider registered successfully' })
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
    @ApiOperation({
        summary: 'Register a Delivery',
        operationId: 'registerDelivery',
    })
    @ApiResponse({ status: 201, description: 'Delivery registered successfully' })
    async registerDelivery() {
        return 'register delivery';
    }

    @Post("deliveryman")
        @ApiOperation({
            summary: 'Register a Delivery Person',
            operationId: 'registerDeliveryPerson',
        })
        @ApiConsumes('multipart/form-data')
        @ApiBody({ type: RegisterDeliveryPersonDTO })
        @UseInterceptors(AnyFilesInterceptor()) 
        @ApiResponse({ status: 201, description: 'Delivery person registered successfully' })
        async registerDeliveryPerson(
            @UploadedFiles() files: Array<Express.Multer.File>,  
            @Body() registerDeliveryPersonDto: RegisterDeliveryPersonDTO,
        ) {
            const deliveryPersonFiles = files.filter(file => file.fieldname === 'delivery_person_documents');
            const vehicleFiles = files.filter(file => file.fieldname === 'vehicle_documents');

            const message = await this.registerService.createDeliveryPerson(registerDeliveryPersonDto, deliveryPersonFiles, vehicleFiles);
            return { message };
        }


    @Get("plan")
    async getPlan() {
        return this.registerService.getSubscriptionStats();
    }

    @Get("language")
    async getLanguage() : Promise<{ language_id: string, language_name: string, iso_code: string, active: boolean }[]> {
        return this.registerService.getLanguage();
    }
    
}
