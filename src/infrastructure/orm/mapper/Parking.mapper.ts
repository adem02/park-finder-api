import { Parking as DomainParking } from '../../../domain/entities/Parking';
import { Parking as ModelParking } from '../prisma/generated/client';
import { CoordinatesVO } from '../../../domain/value-objects/Coordinates.vo';
import { UserMapper } from './User.mapper';
import { User as ModelUser } from '../prisma/generated/client';
import { User as DomainUser } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';

type ParkingWithOptionalUser = ModelParking & {
  addedBy?: ModelUser | null;
};

export class ParkingMapper {
  static toDomain(model: ParkingWithOptionalUser): DomainParking {
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
      photos: model.photos,
      coordinates,
      addedBy,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt ?? undefined,
    });
  }
}
