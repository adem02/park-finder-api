import { Injectable } from '@nestjs/common';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { ParkingRepository } from '../../../application/gateway/Parking.repository';
import { Parking } from '../../../domain/entities/Parking';
import type {
  FindNearByOptions,
  NearbyParkingItem,
  ParkingWithScore,
} from '../../../domain/types/parking.types';
import { CoordinatesVO } from '../../../domain/value-objects/Coordinates.vo';
import { ParkingScoreVO } from '../../../domain/value-objects/ParkingScore.vo';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { parkings, users, votes } from '../drizzle/schema';
import { ParkingMapper } from '../mapper/Parking.mapper';
import { AvailabilityMapper } from '../mapper/Availability.mapper';

interface ParkingRow {
  [key: string]: unknown;
  id: string;
  name: string;
  totalSpots: number;
  photos: string[] | null;
  latitude: number;
  longitude: number;
  addedById: string;
  createdAt: Date;
  updatedAt: Date | null;
}

interface LatestReportRow {
  [key: string]: unknown;
  id: string;
  parkingId: string;
  reportedById: string;
  availableSpots: number;
  reportedAt: Date;
}

@Injectable()
export class DrizzleParkingRepository implements ParkingRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findNearBy(
    coordinates: CoordinatesVO,
    options: FindNearByOptions = {},
  ): Promise<Parking[]> {
    const { latitude, longitude } = coordinates;
    const { radius = 5000, limit = 10 } = options;

    const result = await this.drizzleService.db.execute<ParkingRow>(sql`
      WITH ref AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS point
      )
      SELECT p.*
      FROM parkings p, ref
      WHERE ST_DWithin(p.location, ref.point, ${radius})
      ORDER BY ST_Distance(p.location, ref.point) ASC
      LIMIT ${limit}
    `);

    return result.rows.map((row) =>
      ParkingMapper.toDomain({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
      }),
    );
  }

  async findNearByWithDetails(
    coordinates: CoordinatesVO,
    options: FindNearByOptions = {},
  ): Promise<NearbyParkingItem[]> {
    const { latitude, longitude } = coordinates;
    const { radius = 5000, limit = 10 } = options;

    const nearbyResult = await this.drizzleService.db.execute<{
      [key: string]: unknown;
      id: string;
      distance: number;
    }>(sql`
      WITH ref AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS point
      )
      SELECT p.id, ST_Distance(p.location, ref.point) AS distance
      FROM parkings p, ref
      WHERE ST_DWithin(p.location, ref.point, ${radius})
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    const nearbyRows = nearbyResult.rows;
    if (nearbyRows.length === 0) return [];

    const ids = nearbyRows.map((row) => row.id);

    const [parkingRows, voteRows, latestReportsResult] = await Promise.all([
      this.drizzleService.db
        .select({ parking: parkings, addedBy: users })
        .from(parkings)
        .innerJoin(users, eq(parkings.addedById, users.id))
        .where(inArray(parkings.id, ids)),
      this.drizzleService.db
        .select()
        .from(votes)
        .where(inArray(votes.parkingId, ids)),
      this.drizzleService.db.execute<LatestReportRow>(sql`
        SELECT DISTINCT ON ("parkingId") id, "parkingId", "reportedById", "availableSpots", "reportedAt"
        FROM availability_reports
        WHERE "parkingId" IN (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )}) AND expired = false
        ORDER BY "parkingId", "reportedAt" DESC
      `),
    ]);

    const parkingById = new Map(
      parkingRows.map((row) => [row.parking.id, row]),
    );
    const votesByParkingId = new Map<string, typeof voteRows>();
    for (const vote of voteRows) {
      const list = votesByParkingId.get(vote.parkingId) ?? [];
      list.push(vote);
      votesByParkingId.set(vote.parkingId, list);
    }
    const latestReportByParkingId = new Map(
      latestReportsResult.rows.map((row) => [row.parkingId, row]),
    );

    return nearbyRows.flatMap((row) => {
      const match = parkingById.get(row.id);
      if (!match) return [];

      const parkingWithAddedBy = { ...match.parking, addedBy: match.addedBy };

      const parkingVotes = votesByParkingId.get(row.id) ?? [];
      const upvotes = parkingVotes.filter(
        (v) => v.voteType === 'UPVOTE',
      ).length;
      const downvotes = parkingVotes.length - upvotes;
      const score = ParkingScoreVO.create(upvotes, downvotes);

      const reportRow = latestReportByParkingId.get(row.id);
      const latestReport = reportRow
        ? AvailabilityMapper.toDomain({
            id: reportRow.id,
            parkingId: reportRow.parkingId,
            reportedById: reportRow.reportedById,
            availableSpots: reportRow.availableSpots,
            reportedAt: new Date(reportRow.reportedAt),
            parking: parkingWithAddedBy,
          })
        : null;

      return [
        {
          parking: ParkingMapper.toDomain(parkingWithAddedBy),
          score,
          latestReport,
          distanceMeters: Number(row.distance),
        },
      ];
    });
  }

  async findById(id: string): Promise<Parking | null> {
    const [row] = await this.drizzleService.db
      .select({ parking: parkings, addedBy: users })
      .from(parkings)
      .innerJoin(users, eq(parkings.addedById, users.id))
      .where(eq(parkings.id, id))
      .limit(1);

    return row
      ? ParkingMapper.toDomain({ ...row.parking, addedBy: row.addedBy })
      : null;
  }

  async create(parking: Parking): Promise<void> {
    await this.drizzleService.db.transaction(async (tx) => {
      await tx.insert(parkings).values({
        id: parking.id,
        name: parking.name,
        totalSpots: parking.totalSpots,
        photos: parking.photos as string[],
        latitude: parking.coordinates.latitude,
        longitude: parking.coordinates.longitude,
        addedById: parking.addedBy.id,
        createdAt: parking.createdAt,
        updatedAt: parking.updatedAt,
      });

      await tx.execute(sql`
        UPDATE parkings
        SET location = ST_SetSRID(ST_MakePoint(${parking.coordinates.longitude}, ${parking.coordinates.latitude}), 4326)::geography
        WHERE id = ${parking.id}
      `);
    });
  }

  async findByUserId(userId: string): Promise<ParkingWithScore[]> {
    const parkingRows = await this.drizzleService.db
      .select({ parking: parkings, addedBy: users })
      .from(parkings)
      .innerJoin(users, eq(parkings.addedById, users.id))
      .where(eq(parkings.addedById, userId))
      .orderBy(desc(parkings.createdAt));

    const parkingIds = parkingRows.map((row) => row.parking.id);
    const voteRows = parkingIds.length
      ? await this.drizzleService.db
          .select()
          .from(votes)
          .where(inArray(votes.parkingId, parkingIds))
      : [];

    const votesByParkingId = new Map<string, typeof voteRows>();
    for (const vote of voteRows) {
      const list = votesByParkingId.get(vote.parkingId) ?? [];
      list.push(vote);
      votesByParkingId.set(vote.parkingId, list);
    }

    return parkingRows.map((row) => {
      const parkingVotes = votesByParkingId.get(row.parking.id) ?? [];
      const upvotes = parkingVotes.filter(
        (v) => v.voteType === 'UPVOTE',
      ).length;
      const downvotes = parkingVotes.filter(
        (v) => v.voteType === 'DOWNVOTE',
      ).length;

      return {
        parking: ParkingMapper.toDomain({
          ...row.parking,
          addedBy: row.addedBy,
        }),
        score: ParkingScoreVO.create(upvotes, downvotes),
        votesCount: parkingVotes.length,
      };
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.drizzleService.db.delete(parkings).where(eq(parkings.id, id));
  }
}
