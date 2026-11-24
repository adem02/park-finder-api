import { Controller, Delete, Get, HttpCode, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { DecodedToken } from '../../application/types/auth.types';
import { GetUserProfileUseCase } from '../../application/user/GetUserProfile.use-case';
import { GetLeaderboardUseCase } from '../../application/leaderboard/GetLeaderboard.use-case';
import { DeleteAccountUseCase } from '../../application/user/DeleteAccount.use-case';
import { RefreshTokenCookie } from '../auth/RefreshTokenCookie';
import { GetUserProfileOutputDTO } from './dto/GetUserProfile.dto';
import { GetLeaderboardOutputDTO } from './dto/GetLeaderboard.dto';
import type { YearMonth } from '../../domain/types/leaderboard.types';

@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    private readonly refreshCookie: RefreshTokenCookie,
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

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Delete the authenticated account (anonymized: parkings kept under PlaceGratos, comments deleted)',
  })
  @ApiNoContentResponse()
  async deleteMe(
    @GetUser() user: DecodedToken,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.deleteAccountUseCase.execute({ userId: user.userId });
    this.refreshCookie.clear(res);
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
