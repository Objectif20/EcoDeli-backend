import { Body, Controller, Get } from "@nestjs/common";
import { PlanningService } from "./planning.service";



@Controller('client/planning')
export class PlanningController {
  constructor(
    private readonly planningService : PlanningService
  ) {}

    @Get()
    async getMyPlanning(@Body() body: { user_id: string }) {
        const { user_id } = body;
        return this.planningService.getMyPlanning(user_id);
    }

}