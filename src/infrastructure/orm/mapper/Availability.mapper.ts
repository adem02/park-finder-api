import {
  AvailabilityReport as ModelAvailabilityReport,
  User as ModelUser,
  Parking as ModelParking,
} from '../prisma/generated/client';
import { AvailabilityReport } from '../../../domain/entities/AvailabilityReport';
import { Parking } from '../../../domain/entities/Parking';
import { User } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';
import { UserMapper } from './User.mapper';
import { ParkingMapper } from './Parking.mapper';

type AvailabilityReportWithRelations = ModelAvailabilityReport & {
  reportedBy?: ModelUser | null;
  parking?: ModelParking | null;
};

export class AvailabilityMapper {
  static toDomain(model: AvailabilityReportWithRelations): AvailabilityReport {
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
