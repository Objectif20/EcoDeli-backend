import { Body, Controller, Get, UseGuards } from "@nestjs/common";
import { DocumentService } from "./document.service";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";

@Controller('client/documents')
export class DocumentController {
  constructor(private readonly documentService : DocumentService) {}

  @Get("mine")
  @UseGuards(ClientJwtGuard)
    async getMyProfileDocuments(
        @Body('user_id') user_id: string
    ) {
        return this.documentService.getMyProfileDocuments(user_id);
    }


}