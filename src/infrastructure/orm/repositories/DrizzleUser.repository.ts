import { Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { UserRepository } from '../../../application/gateway/User.repository';
import { User } from '../../../domain/entities/User';
import { UserStats } from '../../../domain/types/user.types';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { availabilityReports, parkings, users, votes } from '../drizzle/schema';
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

  async findStatsByUserId(userId: string): Promise<UserStats> {
    return this.drizzleService.db.transaction(async (tx) => {
      const [[parkingsAdded], [reportsCount], [votesCount]] = await Promise.all(
        [
          tx
            .select({ value: count() })
            .from(parkings)
            .where(eq(parkings.addedById, userId)),
          tx
            .select({ value: count() })
            .from(availabilityReports)
            .where(eq(availabilityReports.reportedById, userId)),
          tx
            .select({ value: count() })
            .from(votes)
            .where(eq(votes.votedById, userId)),
        ],
      );

      return {
        parkingsAdded: parkingsAdded.value,
        reportsCount: reportsCount.value,
        votesCount: votesCount.value,
      };
    });
  }

  async updatePointsById(id: string, points: number): Promise<void> {
    await this.drizzleService.db
      .update(users)
      .set({ points: sql`${users.points} + ${points}` })
      .where(eq(users.id, id));
  }
}
