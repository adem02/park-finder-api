import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { VoteRepository } from '../../../application/gateway';
import { Vote } from '../../../domain/entities/Vote';
import { ResourceNotFoundException } from '../../../domain/exceptions/ResourceNotFound.exception';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { votes } from '../drizzle/schema';
import { VoteMapper } from '../mapper/Vote.mapper';

@Injectable()
export class DrizzleVoteRepository implements VoteRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findByParkingIdAndUserId(
    parkingId: string,
    userId: string,
  ): Promise<Vote | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(votes)
      .where(and(eq(votes.parkingId, parkingId), eq(votes.votedById, userId)))
      .limit(1);

    return row ? VoteMapper.toDomain(row) : null;
  }

  async findByParkingId(parkingId: string): Promise<Vote[]> {
    const rows = await this.drizzleService.db
      .select()
      .from(votes)
      .where(eq(votes.parkingId, parkingId));

    return rows.map((row) => VoteMapper.toDomain(row));
  }

  async create(vote: Vote): Promise<void> {
    await this.drizzleService.db.insert(votes).values({
      id: vote.id,
      votedById: vote.votedBy.id,
      voteType: vote.voteType,
      parkingId: vote.parking.id,
      createdAt: vote.createdAt,
    });
  }

  async update(updatedVote: Vote): Promise<void> {
    await this.drizzleService.db
      .update(votes)
      .set({ voteType: updatedVote.voteType })
      .where(eq(votes.id, updatedVote.id));
  }

  async cancelByParkingIdAndUserId(
    parkingId: string,
    userId: string,
  ): Promise<void> {
    const deleted = await this.drizzleService.db
      .delete(votes)
      .where(and(eq(votes.parkingId, parkingId), eq(votes.votedById, userId)))
      .returning({ id: votes.id });

    if (deleted.length === 0) {
      throw new ResourceNotFoundException('Vote not found');
    }
  }
}
