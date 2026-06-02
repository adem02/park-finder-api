import { ApiProperty } from '@nestjs/swagger';
import { GetUserProfileResponse } from '../../../application/user/GetUserProfile.use-case';

class ProfileUserDto {
  @ApiProperty({ example: 'a1b2c3' })
  id!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  email?: string;

  @ApiProperty({
    example: 'https://cdn.example.com/photo.jpg',
    required: false,
  })
  photoUrl?: string;
}

class ProfileStatsDto {
  @ApiProperty({ example: 14 }) parkingsAdded!: number;
  @ApiProperty({ example: 7 }) reportsCount!: number;
  @ApiProperty({ example: 23 }) votesCount!: number;
  @ApiProperty({ example: 2450 }) points!: number;
  @ApiProperty({ example: 12 }) level!: number;
  @ApiProperty({ example: 1300 }) nextLevelThreshold!: number;
  @ApiProperty({ example: 50 }) progressToNextLevel!: number;
  @ApiProperty({ example: 50 }) pointsToNextLevel!: number;
}

class ProfileBadgeDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Explorer' }) name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() iconUrl!: string;
}

class ProfileRankDto {
  @ApiProperty({ example: 42 }) rank!: number;
  @ApiProperty({ example: '5%' }) percentile!: string;
  @ApiProperty({ example: 1230 }) monthlyPoints!: number;
}

class ProfileRecentParkingDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 9 }) score!: number;
  @ApiProperty({ example: 11 }) votesCount!: number;
}

export class GetUserProfileOutputDTO {
  @ApiProperty({ type: ProfileUserDto })
  readonly user: ProfileUserDto;

  @ApiProperty({ type: ProfileStatsDto })
  readonly stats: ProfileStatsDto;

  @ApiProperty({ type: [ProfileBadgeDto] })
  readonly badges: ProfileBadgeDto[];

  @ApiProperty({ type: ProfileRankDto, nullable: true })
  readonly rank: ProfileRankDto | null;

  @ApiProperty({ type: [ProfileRecentParkingDto] })
  readonly recentParkings: ProfileRecentParkingDto[];

  constructor(response: GetUserProfileResponse) {
    const { user, stats, badges, rank, recentParkings } = response;

    this.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      photoUrl: user.photoUrl,
    };

    this.stats = {
      parkingsAdded: stats.parkingsAdded,
      reportsCount: stats.reportsCount,
      votesCount: stats.votesCount,
      points: user.pointsBalance.points,
      level: user.pointsBalance.level,
      nextLevelThreshold: user.pointsBalance.nextLevelThreshold,
      progressToNextLevel: user.pointsBalance.progressToNextLevel,
      pointsToNextLevel: user.pointsBalance.pointsToNextLevel,
    };

    this.badges = badges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      iconUrl: badge.iconUrl,
    }));

    this.rank = rank
      ? {
          rank: rank.rank,
          percentile: rank.percentile,
          monthlyPoints: rank.monthlyPoints,
        }
      : null;

    this.recentParkings = recentParkings.map(
      ({ parking, score, votesCount }) => ({
        id: parking.id,
        name: parking.name,
        score: score.netScore,
        votesCount,
      }),
    );
  }
}
