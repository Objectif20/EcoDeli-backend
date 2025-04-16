import { Body, Controller, Get, UseGuards } from "@nestjs/common";
import { PlanningService } from "./planning.service";
import { ClientJwtGuard } from "src/common/guards/user-jwt.guard";



@Controller('client/planning')
export class PlanningController {
  constructor(
    private readonly planningService : PlanningService
  ) {}

    @Get()
    @UseGuards(ClientJwtGuard)
    async getMyPlanning(@Body() body: { user_id: string }) {
        const { user_id } = body;
        return this.planningService.getMyPlanning(user_id);
    }

}