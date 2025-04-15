import { Body, Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { User } from './type';
import { ClientJwtGuard } from 'src/common/guards/user-jwt.guard';



@ApiTags('Client Profile Management')
@Controller('client/profile')
export class ClientProfileController {
  constructor(private readonly profileService : ProfileService) {}

  @Get('me')
  @UseGuards(ClientJwtGuard)
  @ApiOperation({
    summary: 'Get My Profile',
    operationId: 'getMyProfile',
  })
  @ApiResponse({ status: 200, description: 'Client profile retrieved successfully' })
  async getMyProfile(@Body() body: { user_id: string }): Promise<User> {
    const { user_id } = body;
    const user = await this.profileService.getMyProfile(user_id);
    if (!user) {
      throw new Error('Client not found');
    }
    return user;
  }

}
