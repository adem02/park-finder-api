import { AvailabilityStatus } from '../types/availability.types';
import { InvalidAvailabilityReportException } from '../exceptions/InvalidAvailabilityReport.exception';
import { AvailabilityWindowVO } from '../value-objects/AvailabilityWindow.vo';
import { Parking } from './Parking';
import { User } from './User';

interface AvailabilityReportParams {
  id: string;
  parking: Parking;
  reportedBy: User;
  availableSpots: number;
  reportedAt: Date;
}

export class AvailabilityReport {
  private constructor(
    readonly id: string,
    readonly parking: Parking,
    readonly reportedBy: User,
    readonly availableSpots: number,
    readonly reportedAt: Date,
    readonly window: AvailabilityWindowVO,
  ) {}

  static create(params: AvailabilityReportParams): AvailabilityReport {
    if (params.availableSpots < 0) {
      throw new InvalidAvailabilityReportException(
        'availableSpots must be a non-negative number.',
      );
    }
    if (params.availableSpots > params.parking.totalSpots) {
      throw new InvalidAvailabilityReportException(
        'availableSpots cannot exceed the total spots of the parking.',
      );
    }

    return new AvailabilityReport(
      params.id,
      params.parking,
      params.reportedBy,
      params.availableSpots,
      params.reportedAt,
      AvailabilityWindowVO.create(params.reportedAt),
    );
  }

  static reconstitute(params: AvailabilityReportParams): AvailabilityReport {
    return new AvailabilityReport(
      params.id,
      params.parking,
      params.reportedBy,
      params.availableSpots,
      params.reportedAt,
      AvailabilityWindowVO.create(params.reportedAt),
    );
  }

  get isExpired(): boolean {
    return this.window.isExpired;
  }

  get isRecent(): boolean {
    return this.window.isRecent;
  }

  get status(): AvailabilityStatus {
    return this.window.status;
  }
}
