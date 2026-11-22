import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { userBadges } from '../../../../src/infrastructure/orm/drizzle/schema';
import { BadgeBuilder } from './badge.builder';
import { UserBuilder } from './user.builder';

export interface UserBadgeRow {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
}

/**
 * Builder for the `user_badges` table. Auto-creates a default user and
 * badge if not provided.
 */
export class UserBadgeBuilder {
  private row: UserBadgeRow;

  constructor(private readonly drizzleService: DrizzleService) {
    this.row = {
      id: randomUUID(),
      userId: '',
      badgeId: '',
      earnedAt: new Date(),
    };
  }

  forUser(userId: string): this {
    this.row.userId = userId;
    return this;
  }

  forBadge(badgeId: string): this {
    this.row.badgeId = badgeId;
    return this;
  }

  earnedAt(earnedAt: Date): this {
    this.row.earnedAt = earnedAt;
    return this;
  }

  build(): UserBadgeRow {
    return { ...this.row };
  }

  async create(): Promise<UserBadgeRow> {
    if (!this.row.userId) {
      const user = await new UserBuilder(this.drizzleService).create();
      this.row.userId = user.id;
    }
    if (!this.row.badgeId) {
      const badge = await new BadgeBuilder(this.drizzleService).create();
      this.row.badgeId = badge.id;
    }
    await this.drizzleService.db.insert(userBadges).values(this.row);
    return this.build();
  }
}
