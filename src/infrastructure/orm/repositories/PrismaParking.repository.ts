import { Injectable } from '@nestjs/common';
import { ParkingRepository } from '../../../application/gateway/Parking.repository';
import { Parking } from '../../../domain/entities/Parking';
import type {
  FindNearByOptions,
  NearbyParkingItem,
  ParkingWithScore,
} from '../../../domain/types/parking.types';
import { CoordinatesVO } from '../../../domain/value-objects/Coordinates.vo';
import { ParkingScoreVO } from '../../../domain/value-objects/ParkingScore.vo';
import { PrismaService } from '../prisma/Prisma.service';
import { ParkingMapper } from '../mapper/Parking.mapper';
import { AvailabilityMapper } from '../mapper/Availability.mapper';
import { Parking as ModelParking } from '../prisma/generated/client';

@Injectable()
export class PrismaParkingRepository implements ParkingRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findNearBy(
    coordinates: CoordinatesVO,
    options: FindNearByOptions = {},
  ): Promise<Parking[]> {
    const { latitude, longitude } = coordinates;
    const { radius = 5000, limit = 10 } = options;
    const data = await this.prismaService.$queryRaw<ModelParking[]>`
      WITH ref AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS point
      )
      SELECT p.*
      FROM parkings p, ref
      WHERE ST_DWithin(p.location, ref.point, ${radius})
      ORDER BY ST_Distance(p.location, ref.point) ASC
      LIMIT ${limit}
    `;

    return data.map((row) => ParkingMapper.toDomain(row));
  }

  async findNearByWithDetails(
    coordinates: CoordinatesVO,
    options: FindNearByOptions = {},
  ): Promise<NearbyParkingItem[]> {
    const { latitude, longitude } = coordinates;
    const { radius = 5000, limit = 10 } = options;
    const rows = await this.prismaService.$queryRaw<
      Array<{ id: string; distance: number }>
    >`
      WITH ref AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS point
      )
      SELECT p.id, ST_Distance(p.location, ref.point) AS distance
      FROM parkings p, ref
      WHERE ST_DWithin(p.location, ref.point, ${radius})
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const parkings = await this.prismaService.parking.findMany({
      where: { id: { in: ids } },
      include: {
        addedBy: true,
        votes: true,
        availabilityReports: {
          where: { expired: false },
          orderBy: { reportedAt: 'desc' },
          take: 1,
        },
      },
    });

    const byId = new Map(parkings.map((p) => [p.id, p]));

    return rows.flatMap((row) => {
      const model = byId.get(row.id);
      if (!model) return [];

      const upvotes = model.votes.filter((v) => v.voteType === 'UPVOTE').length;
      const downvotes = model.votes.length - upvotes;
      const score = ParkingScoreVO.create(upvotes, downvotes);

      const reportModel = model.availabilityReports[0] ?? null;
      const latestReport = reportModel
        ? AvailabilityMapper.toDomain({ ...reportModel, parking: model })
        : null;

      return [
        {
          parking: ParkingMapper.toDomain(model),
          score,
          latestReport,
          distanceMeters: Number(row.distance),
        },
      ];
    });
  }

  async findById(id: string): Promise<Parking | null> {
    const parking = await this.prismaService.parking.findUnique({
      where: { id },
      include: { addedBy: true },
    });

    return parking !== null ? ParkingMapper.toDomain(parking) : null;
  }

  async create(parking: Parking): Promise<void> {
    await this.prismaService.$transaction([
      this.prismaService.parking.create({
        data: {
          id: parking.id,
          name: parking.name,
          totalSpots: parking.totalSpots,
          photos: parking.photos as string[],
          latitude: parking.coordinates.latitude,
          longitude: parking.coordinates.longitude,
          addedById: parking.addedBy.id,
          createdAt: parking.createdAt,
          updatedAt: parking.updatedAt,
        },
      }),
      this.prismaService.$executeRaw`
        UPDATE parkings
        SET location = ST_SetSRID(ST_MakePoint(${parking.coordinates.longitude}, ${parking.coordinates.latitude}), 4326)::geography
        WHERE id = ${parking.id}
      `,
    ]);
  }

  async findByUserId(userId: string): Promise<ParkingWithScore[]> {
    const rows = await this.prismaService.parking.findMany({
      where: { addedById: userId },
      orderBy: { createdAt: 'desc' },
      include: { addedBy: true, votes: true },
    });

    return rows.map((row) => {
      const upvotes = row.votes.filter((v) => v.voteType === 'UPVOTE').length;
      const downvotes = row.votes.filter(
        (v) => v.voteType === 'DOWNVOTE',
      ).length;

      return {
        parking: ParkingMapper.toDomain(row),
        score: ParkingScoreVO.create(upvotes, downvotes),
        votesCount: row.votes.length,
      };
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prismaService.parking.delete({ where: { id } });
  }
}
