import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { availabilityReports } from '../../../../src/infrastructure/orm/drizzle/schema';
import { ParkingBuilder } from './parking.builder';
import { UserBuilder } from './user.builder';

export interface AvailabilityReportRow {
  id: string;
  parkingId: string;
  reportedById: string;
  availableSpots: number;
  reportedAt: Date;
  expiresAt: Date;
  expired: boolean;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000;

/**
 * Builder for the `availability_reports` table. Auto-creates a default
 * parking and reporter if not provided; defaults to a report reported "now"
 * and expiring in 15 minutes (matches AVAILABILITY_REPORT_TTL convention).
 */
export class AvailabilityReportBuilder {
  private row: AvailabilityReportRow;

  constructor(private readonly drizzleService: DrizzleService) {
    const reportedAt = new Date();
    this.row = {
      id: randomUUID(),
      parkingId: '',
      reportedById: '',
      availableSpots: 5,
      reportedAt,
      expiresAt: new Date(reportedAt.getTime() + DEFAULT_TTL_MS),
      expired: false,
    };
  }

  forParking(parkingId: string): this {
    this.row.parkingId = parkingId;
    return this;
  }

  reportedBy(userId: string): this {
    this.row.reportedById = userId;
    return this;
  }

  withAvailableSpots(availableSpots: number): this {
    this.row.availableSpots = availableSpots;
    return this;
  }

  reportedAt(reportedAt: Date): this {
    this.row.reportedAt = reportedAt;
    return this;
  }

  expiresAt(expiresAt: Date): this {
    this.row.expiresAt = expiresAt;
    return this;
  }

  withExpired(expired: boolean): this {
    this.row.expired = expired;
    return this;
  }

  build(): AvailabilityReportRow {
    return { ...this.row };
  }

  async create(): Promise<AvailabilityReportRow> {
    if (!this.row.parkingId) {
      const parking = await new ParkingBuilder(this.drizzleService).create();
      this.row.parkingId = parking.id;
    }
    if (!this.row.reportedById) {
      const user = await new UserBuilder(this.drizzleService).create();
      this.row.reportedById = user.id;
    }
    await this.drizzleService.db.insert(availabilityReports).values(this.row);
    return this.build();
  }
}
