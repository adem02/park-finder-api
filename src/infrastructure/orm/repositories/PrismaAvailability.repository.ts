import { AvailabilityRepository } from '../../../application/gateway';
import { Injectable } from '@nestjs/common';
import { AvailabilityReport } from '../../../domain/entities/AvailabilityReport';
import { PrismaService } from '../prisma/Prisma.service';
import { AvailabilityMapper } from '../mapper/Availability.mapper';

@Injectable()
export class PrismaAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findLatestByParkingId(
    parkingId: string,
  ): Promise<AvailabilityReport | null> {
    const report = await this.prismaService.availabilityReport.findFirst({
      where: { parkingId, expired: false },
      orderBy: { reportedAt: 'desc' },
      include: { parking: true, reportedBy: true },
    });

    return report ? AvailabilityMapper.toDomain(report) : null;
  }

  async findByParkingId(parkingId: string): Promise<AvailabilityReport[]> {
    const reports = await this.prismaService.availabilityReport.findMany({
      where: { parkingId },
      orderBy: { reportedAt: 'desc' },
      include: { parking: true, reportedBy: true },
    });

    return reports.map((report) => AvailabilityMapper.toDomain(report));
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

  async expireOld(): Promise<void> {
    await this.prismaService.availabilityReport.updateMany({
      where: { expired: false, expiresAt: { lte: new Date() } },
      data: { expired: true },
    });
  }
}
