import { ApiProperty } from '@nestjs/swagger';
import { GetLeaderboardResponse } from '../../../application/leaderboard/GetLeaderboard.use-case';

class LeaderboardEntryDto {
  @ApiProperty({ example: 1 }) rank!: number;
  @ApiProperty({ example: 'johndoe' }) username!: string;
  @ApiProperty({ example: 'a1b2c3' }) userId!: string;
  @ApiProperty({
    example: 'https://cdn.example.com/photo.jpg',
    required: false,
  })
  photoUrl?: string;
  @ApiProperty({ example: 1230 }) monthlyPoints!: number;
}

class LeaderboardUserRankDto {
  @ApiProperty({ example: 42 }) rank!: number;
  @ApiProperty({ example: '5%' }) percentile!: string;
  @ApiProperty({ example: 1230 }) monthlyPoints!: number;
}

export class GetLeaderboardOutputDTO {
  @ApiProperty({ example: '2026-05' })
  readonly month: string;

  @ApiProperty({ type: [LeaderboardEntryDto] })
  readonly entries: LeaderboardEntryDto[];

  @ApiProperty({ type: LeaderboardUserRankDto, nullable: true })
  readonly userRank: LeaderboardUserRankDto | null;

  constructor(response: GetLeaderboardResponse) {
    this.month = response.month;
    this.entries = response.entries.map((entry) => ({
      rank: entry.rank,
      userId: entry.user.id,
      username: entry.user.username,
      photoUrl: entry.user.photoUrl,
      monthlyPoints: entry.monthlyPoints,
    }));
    this.userRank = response.userRank;
  }
}
