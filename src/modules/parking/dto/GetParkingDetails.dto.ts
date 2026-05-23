import { ApiProperty } from '@nestjs/swagger';
import { GetParkingDetailsResponse } from '../../../application/parking/GetParkingDetails.use-case';

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

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty({ required: false })
  readonly updatedAt?: Date;

  constructor(response: GetParkingDetailsResponse) {
    const { parking } = response;
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
    this.createdAt = parking.createdAt;
    this.updatedAt = parking.updatedAt;
  }
}
