import { GetParkingDetailsResponse } from '../../../application/parking/GetParkingDetails.use-case';

export class GetParkingDetailsOutputDTO {
  readonly id: string;
  readonly name: string;
  readonly totalSpots: number;
  readonly photos: ReadonlyArray<string>;
  readonly coordinates: {
    latitude: number;
    longitude: number;
  };
  readonly addedBy: {
    id: string;
    username: string;
    photoUrl?: string;
  };
  readonly createdAt: Date;
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
