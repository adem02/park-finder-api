import { Injectable } from '@nestjs/common';
import { BadgeRepository } from '../../../application/gateway/Badge.repository';
import { Badge } from '../../../domain/entities/Badge';
import { UuidGenerator } from '../../../common/utils/UuidGenerator';
import { PrismaService } from '../prisma/Prisma.service';
import { BadgeMapper } from '../mapper/Badge.mapper';

@Injectable()
export class PrismaBadgeRepository implements BadgeRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(): Promise<Badge[]> {
    const rows = await this.prismaService.badge.findMany();
    return rows.map((row) => BadgeMapper.toDomain(row));
  }

  async findByUserId(userId: string): Promise<Badge[]> {
    const rows = await this.prismaService.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
    return rows.map((row) => BadgeMapper.toDomain(row.badge));
  }

  async assignToUser(userId: string, badge: Badge): Promise<void> {
    await this.prismaService.userBadge.create({
      data: {
        id: UuidGenerator.Generate(),
        userId,
        badgeId: badge.id,
      },
    });
  }
}
