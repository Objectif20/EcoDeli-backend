import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { RegisterModule } from "./register/register.module";


@Module({
    imports: [AuthModule,RegisterModule],
    providers: [],
})
export class ClientModule { }