import { Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { UserRepository } from '../../../application/gateway/User.repository';
import { User } from '../../../domain/entities/User';
import { UserStats } from '../../../domain/types/user.types';
import { DrizzleService } from '../drizzle/Drizzle.service';
import {
  availabilityReports,
  comments,
  monthlyLeaderboard,
  parkings,
  refreshTokens,
  userBadges,
  userCredentials,
  users,
  votes,
} from '../drizzle/schema';
import { DELETED_USERNAME_PREFIX } from '../../../domain/constants/user.constants';
import { UserMapper } from '../mapper/User.mapper';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return row ? UserMapper.toDomain(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return row ? UserMapper.toDomain(row) : null;
  }

  async create(user: User): Promise<void> {
    await this.drizzleService.db.insert(users).values({
      id: user.id,
      username: user.username,
      email: user.email,
      photoUrl: user.photoUrl,
      points: user.pointsBalance.points,
      createdAt: user.createdAt,
    });
  }

  updateById(_id: string, _updatedUser: User): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async deleteById(id: string): Promise<void> {
    await this.drizzleService.db.delete(users).where(eq(users.id, id));
  }

  async anonymize(
    id: string,
    parkingsHeir: { id: string; username: string },
  ): Promise<void> {
    await this.drizzleService.db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ ...parkingsHeir, email: null })
        .onConflictDoNothing({ target: users.id });
      await tx
        .update(parkings)
        .set({ addedById: parkingsHeir.id })
        .where(eq(parkings.addedById, id));

      await tx.delete(comments).where(eq(comments.authorId, id));
      await tx.delete(userBadges).where(eq(userBadges.userId, id));
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
      await tx.delete(userCredentials).where(eq(userCredentials.userId, id));

      // Leaving the leaderboard shifts the others up: ranks of the affected months are recomputed.
      const leftMonths = await tx
        .delete(monthlyLeaderboard)
        .where(eq(monthlyLeaderboard.userId, id))
        .returning({ month: monthlyLeaderboard.month });
      for (const { month } of leftMonths) {
        await tx.execute(sql`
          UPDATE monthly_leaderboard ml
          SET rank = sub.rnk
          FROM (
            SELECT id, RANK() OVER (ORDER BY "monthlyPoints" DESC) AS rnk
            FROM monthly_leaderboard
            WHERE month = ${month}
          ) sub
          WHERE ml.id = sub.id AND ml.month = ${month}
        `);
      }

      await tx
        .update(users)
        .set({
          username: `${DELETED_USERNAME_PREFIX}${id.replace(/-/g, '').slice(0, 12)}`,
          email: null,
          photoUrl: null,
          points: 0,
        })
        .where(eq(users.id, id));
    });
  }

  async findStatsByUserId(userId: string): Promise<UserStats> {
    // Three independent counts, run in parallel on the pool (one connection each).
    // They used to share a transaction's single connection, which pg only
    // serialises with a deprecation warning (an error from pg@9); the
    // transaction brought no consistency anyway under READ COMMITTED.
    const { db } = this.drizzleService;
    const [[parkingsAdded], [reportsCount], [votesCount]] = await Promise.all([
      db
        .select({ value: count() })
        .from(parkings)
        .where(eq(parkings.addedById, userId)),
      db
        .select({ value: count() })
        .from(availabilityReports)
        .where(eq(availabilityReports.reportedById, userId)),
      db
        .select({ value: count() })
        .from(votes)
        .where(eq(votes.votedById, userId)),
    ]);

    return {
      parkingsAdded: parkingsAdded.value,
      reportsCount: reportsCount.value,
      votesCount: votesCount.value,
    };
  }

  async updatePointsById(id: string, points: number): Promise<void> {
    await this.drizzleService.db
      .update(users)
      .set({ points: sql`${users.points} + ${points}` })
      .where(eq(users.id, id));
  }
}
