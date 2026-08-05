import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { BadgeRepository } from '../../../application/gateway/Badge.repository';
import { Badge } from '../../../domain/entities/Badge';
import { UuidGenerator } from '../../../common/utils/UuidGenerator';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { badges, userBadges } from '../drizzle/schema';
import { BadgeMapper } from '../mapper/Badge.mapper';

@Injectable()
export class DrizzleBadgeRepository implements BadgeRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findAll(): Promise<Badge[]> {
    const rows = await this.drizzleService.db.select().from(badges);
    return rows.map((row) => BadgeMapper.toDomain(row));
  }

  async findByUserId(userId: string): Promise<Badge[]> {
    const rows = await this.drizzleService.db
      .select({ badge: badges })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));

    return rows.map((row) => BadgeMapper.toDomain(row.badge));
  }

  async assignToUser(userId: string, badge: Badge): Promise<void> {
    await this.drizzleService.db.insert(userBadges).values({
      id: UuidGenerator.Generate(),
      userId,
      badgeId: badge.id,
    });
  }
}
