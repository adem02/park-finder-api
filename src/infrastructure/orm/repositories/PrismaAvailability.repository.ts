import { AvailabilityRepository } from '../../../application/gateway';
import { Injectable } from '@nestjs/common';
import { AvailabilityReport } from '../../../domain/entities/AvailabilityReport';
import { PrismaService } from '../prisma/Prisma.service';

@Injectable()
export class PrismaAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findLatestByParkingId(
    _parkingId: string,
  ): Promise<AvailabilityReport | null> {
    throw new Error('Method not implemented.');
  }

  findByParkingId(_parkingId: string): Promise<AvailabilityReport[]> {
    throw new Error('Method not implemented.');
  }

  async create(report: AvailabilityReport): Promise<void> {
    await this.prismaService.availabilityReport.create({
      data: {
        id: report.id,
        parkingId: report.parking.id,
        reportedById: report.reportedBy.id,
        availableSpots: report.availableSpots,
        reportedAt: report.reportedAt,
        expiresAt: report.window.expiresAt,
      },
    });
  }

  expireOld(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
