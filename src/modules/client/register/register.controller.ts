import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ClientProfile } from "src/common/decorator/client-profile.decorator";
import { ClientProfileGuard } from "src/common/guards/client-profile.guard";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";
import { RegisterClientDTO } from "./dto/register.client.dto";
import { RegisterService } from "./register.service";
import { RegisterMerchantDTO } from "./dto/register.merchant.dto";


@Controller("client/register")
export class RegisterController {
    constructor(
        private readonly registerService : RegisterService
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
    async registerProvider(){
        return 'register provider';
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