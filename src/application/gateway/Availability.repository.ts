import { AvailabilityReport } from '../../domain/entities/AvailabilityReport';

export interface AvailabilityRepository {
  findLatestByParkingId(parkingId: string): Promise<AvailabilityReport | null>;
  findByParkingId(parkingId: string): Promise<AvailabilityReport[]>;
  create(report: AvailabilityReport): Promise<void>;
  expireOld(): Promise<void>;
}
