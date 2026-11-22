import { AvailabilityReport } from '../../../domain/entities/AvailabilityReport';
import { Parking } from '../../../domain/entities/Parking';
import { User } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';
import { UserMapper } from './User.mapper';
import { ParkingMapper } from './Parking.mapper';

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

interface AvailabilityReportModel {
  id: string;
  parkingId: string;
  reportedById: string;
  availableSpots: number;
  reportedAt: Date;
  parking?: ParkingModel | null;
  reportedBy?: UserModel | null;
}

export class AvailabilityMapper {
  static toDomain(model: AvailabilityReportModel): AvailabilityReport {
    const reportedBy = model.reportedBy
      ? UserMapper.toDomain(model.reportedBy)
      : User.reconstitute({
          id: model.reportedById,
          username: '',
          pointsBalance: PointsBalanceVO.create(0),
          createdAt: new Date(),
        });

    const parking = model.parking
      ? ParkingMapper.toDomain(model.parking)
      : Parking.placeholder(model.parkingId, reportedBy);

    return AvailabilityReport.reconstitute({
      id: model.id,
      parking,
      reportedBy,
      availableSpots: model.availableSpots,
      reportedAt: model.reportedAt,
    });
  }
}
