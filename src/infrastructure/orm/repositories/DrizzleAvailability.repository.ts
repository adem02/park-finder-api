import { Injectable } from '@nestjs/common';
import { and, desc, eq, lte } from 'drizzle-orm';
import { AvailabilityRepository } from '../../../application/gateway';
import { AvailabilityReport } from '../../../domain/entities/AvailabilityReport';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { availabilityReports, parkings, users } from '../drizzle/schema';
import { AvailabilityMapper } from '../mapper/Availability.mapper';

@Injectable()
export class DrizzleAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findLatestByParkingId(
    parkingId: string,
  ): Promise<AvailabilityReport | null> {
    const [row] = await this.drizzleService.db
      .select({
        report: availabilityReports,
        parking: parkings,
        reportedBy: users,
      })
      .from(availabilityReports)
      .innerJoin(parkings, eq(availabilityReports.parkingId, parkings.id))
      .innerJoin(users, eq(availabilityReports.reportedById, users.id))
      .where(
        and(
          eq(availabilityReports.parkingId, parkingId),
          eq(availabilityReports.expired, false),
        ),
      )
      .orderBy(desc(availabilityReports.reportedAt))
      .limit(1);

    return row
      ? AvailabilityMapper.toDomain({
          ...row.report,
          parking: row.parking,
          reportedBy: row.reportedBy,
        })
      : null;
  }

  async findByParkingId(parkingId: string): Promise<AvailabilityReport[]> {
    const rows = await this.drizzleService.db
      .select({
        report: availabilityReports,
        parking: parkings,
        reportedBy: users,
      })
      .from(availabilityReports)
      .innerJoin(parkings, eq(availabilityReports.parkingId, parkings.id))
      .innerJoin(users, eq(availabilityReports.reportedById, users.id))
      .where(eq(availabilityReports.parkingId, parkingId))
      .orderBy(desc(availabilityReports.reportedAt));

    return rows.map((row) =>
      AvailabilityMapper.toDomain({
        ...row.report,
        parking: row.parking,
        reportedBy: row.reportedBy,
      }),
    );
  }

  async create(report: AvailabilityReport): Promise<void> {
    await this.drizzleService.db.insert(availabilityReports).values({
      id: report.id,
      parkingId: report.parking.id,
      reportedById: report.reportedBy.id,
      availableSpots: report.availableSpots,
      reportedAt: report.reportedAt,
      expiresAt: report.window.expiresAt,
    });
  }

  async expireOld(): Promise<void> {
    await this.drizzleService.db
      .update(availabilityReports)
      .set({ expired: true })
      .where(
        and(
          eq(availabilityReports.expired, false),
          lte(availabilityReports.expiresAt, new Date()),
        ),
      );
  }
}
