import { Parking as DomainParking } from '../../../domain/entities/Parking';
import { CoordinatesVO } from '../../../domain/value-objects/Coordinates.vo';
import { UserMapper } from './User.mapper';
import { User as DomainUser } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';

interface UserModel {
  id: string;
  username: string;
  email: string | null;
  points: number;
  createdAt: Date;
  updatedAt: Date | null;
}

interface ParkingModel {
  id: string;
  name: string;
  totalSpots: number;
  photos: string[] | null;
  latitude: number;
  longitude: number;
  addedById: string;
  createdAt: Date;
  updatedAt: Date | null;
  addedBy?: UserModel | null;
}

export class ParkingMapper {
  static toDomain(model: ParkingModel): DomainParking {
    const coordinates = CoordinatesVO.reconstruct(
      model.latitude,
      model.longitude,
    );

    const addedBy = model.addedBy
      ? UserMapper.toDomain(model.addedBy)
      : DomainUser.reconstitute({
          id: model.addedById,
          username: '',
          pointsBalance: PointsBalanceVO.create(0),
          createdAt: new Date(),
        });

    return DomainParking.reconstitute({
      id: model.id,
      name: model.name,
      totalSpots: model.totalSpots,
      photos: model.photos ?? [],
      coordinates,
      addedBy,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt ?? undefined,
    });
  }
}
