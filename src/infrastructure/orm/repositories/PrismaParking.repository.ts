import { Injectable } from '@nestjs/common';
import { ParkingRepository } from '../../../application/gateway/Parking.repository';
import { Parking } from '../../../domain/entities/Parking';
import type {
  FindNearByOptions,
  ParkingWithScore,
} from '../../../domain/types/parking.types';
import { CoordinatesVO } from '../../../domain/value-objects/Coordinates.vo';
import { PrismaService } from '../prisma/Prisma.service';
import { ParkingMapper } from '../mapper/Parking.mapper';
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
  updateById(_id: string, _updatedParking: Parking): Promise<void> {
    throw new Error('Method not implemented.');
  }

  findByUserId(_userId: string): Promise<ParkingWithScore[]> {
    throw new Error('Method not implemented.');
  }

  async deleteById(id: string): Promise<void> {
    await this.prismaService.parking.delete({ where: { id } });
  }
}
