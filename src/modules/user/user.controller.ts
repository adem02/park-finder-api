import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { DecodedToken } from '../../application/types/auth.types';
import { GetUserProfileUseCase } from '../../application/user/GetUserProfile.use-case';
import { GetLeaderboardUseCase } from '../../application/leaderboard/GetLeaderboard.use-case';
import { GetUserProfileOutputDTO } from './dto/GetUserProfile.dto';
import { GetLeaderboardOutputDTO } from './dto/GetLeaderboard.dto';
import type { YearMonth } from '../../domain/types/leaderboard.types';

@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user full profile' })
  @ApiResponse({ status: 200, type: GetUserProfileOutputDTO })
  async getMe(@GetUser() user: DecodedToken) {
    const response = await this.getUserProfileUseCase.execute({
      userId: user.userId,
    });

    return new GetUserProfileOutputDTO(response);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get the monthly leaderboard' })
  @ApiQuery({
    name: 'month',
    required: false,
    example: '2026-05',
    description: 'YearMonth (YYYY-MM). Defaults to current month.',
  })
  @ApiResponse({ status: 200, type: GetLeaderboardOutputDTO })
  async getLeaderboard(
    @GetUser() user: DecodedToken,
    @Query('month') month?: YearMonth,
  ) {
    const response = await this.getLeaderboardUseCase.execute({
      month,
      userId: user.userId,
    });

    return new GetLeaderboardOutputDTO(response);
  }
}
