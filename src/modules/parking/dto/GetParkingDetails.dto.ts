import { ApiProperty } from '@nestjs/swagger';
import { GetParkingDetailsResponse } from '../../../application/parking/GetParkingDetails.use-case';
import { VoteType } from '../../../domain/types/vote.types';
import { CommentResponseDto } from './Comment.dto';

class CoordinatesResponseDto {
  @ApiProperty({ example: 48.8566 })
  latitude: number;

  @ApiProperty({ example: 2.3522 })
  longitude: number;
}

class AddedByResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({
    example: 'https://cdn.example.com/photo.jpg',
    required: false,
  })
  photoUrl?: string;
}

class AvailabilityResponseDto {
  @ApiProperty({ example: 12, nullable: true })
  availableSpots: number | null;

  @ApiProperty({ nullable: true, required: false })
  reportedAt: Date | null;

  @ApiProperty({ example: true })
  isRecent: boolean;
}

class VotesResponseDto {
  @ApiProperty({ example: 12 })
  upvotes: number;

  @ApiProperty({ example: 2 })
  downvotes: number;

  @ApiProperty({
    enum: VoteType,
    nullable: true,
    example: VoteType.UPVOTE,
  })
  userVote: VoteType | null;
}

export class GetParkingDetailsOutputDTO {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  readonly id: string;

  @ApiProperty({ example: 'Parking Centrale' })
  readonly name: string;

  @ApiProperty({ example: 50 })
  readonly totalSpots: number;

  @ApiProperty({
    type: [String],
    example: ['https://cdn.example.com/photo.jpg'],
  })
  readonly photos: ReadonlyArray<string>;

  @ApiProperty({ type: CoordinatesResponseDto })
  readonly coordinates: CoordinatesResponseDto;

  @ApiProperty({ type: AddedByResponseDto })
  readonly addedBy: AddedByResponseDto;

  @ApiProperty({ type: AvailabilityResponseDto })
  readonly availability: AvailabilityResponseDto;

  @ApiProperty({ type: VotesResponseDto })
  readonly votes: VotesResponseDto;

  @ApiProperty({ type: [CommentResponseDto] })
  readonly recentComments: CommentResponseDto[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty({ required: false })
  readonly updatedAt?: Date;

  constructor(response: GetParkingDetailsResponse) {
    const { parking, latestReport, votes, userVote, recentComments } = response;
    const { addedBy } = parking;

    this.id = parking.id;
    this.name = parking.name;
    this.totalSpots = parking.totalSpots;
    this.photos = parking.photos;
    this.coordinates = parking.coordinates;
    this.addedBy = {
      id: addedBy.id,
      username: addedBy.username,
      photoUrl: addedBy.photoUrl,
    };

    this.availability =
      latestReport && !latestReport.isExpired
        ? {
            availableSpots: latestReport.availableSpots,
            reportedAt: latestReport.reportedAt,
            isRecent: latestReport.isRecent,
          }
        : { availableSpots: null, reportedAt: null, isRecent: false };

    const upvotes = votes.filter(
      (vote) => vote.voteType === VoteType.UPVOTE,
    ).length;
    this.votes = {
      upvotes,
      downvotes: votes.length - upvotes,
      userVote: userVote?.voteType ?? null,
    };

    this.createdAt = parking.createdAt;
    this.updatedAt = parking.updatedAt;

    this.recentComments = recentComments.map(
      (comment) => new CommentResponseDto(comment),
    );
  }
}
