import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { votes } from '../../../../src/infrastructure/orm/drizzle/schema';
import { ParkingBuilder } from './parking.builder';
import { UserBuilder } from './user.builder';

export type VoteTypeRow = 'UPVOTE' | 'DOWNVOTE';

export interface VoteRow {
  id: string;
  parkingId: string;
  votedById: string;
  voteType: VoteTypeRow;
  createdAt: Date;
}

/**
 * Builder for the `votes` table. Auto-creates a default parking (and its
 * default owner) and a default voter if not provided.
 */
export class VoteBuilder {
  private row: VoteRow;

  constructor(private readonly drizzleService: DrizzleService) {
    this.row = {
      id: randomUUID(),
      parkingId: '',
      votedById: '',
      voteType: 'UPVOTE',
      createdAt: new Date(),
    };
  }

  forParking(parkingId: string): this {
    this.row.parkingId = parkingId;
    return this;
  }

  votedBy(userId: string): this {
    this.row.votedById = userId;
    return this;
  }

  withType(voteType: VoteTypeRow): this {
    this.row.voteType = voteType;
    return this;
  }

  build(): VoteRow {
    return { ...this.row };
  }

  async create(): Promise<VoteRow> {
    if (!this.row.parkingId) {
      const parking = await new ParkingBuilder(this.drizzleService).create();
      this.row.parkingId = parking.id;
    }
    if (!this.row.votedById) {
      const user = await new UserBuilder(this.drizzleService).create();
      this.row.votedById = user.id;
    }
    await this.drizzleService.db.insert(votes).values(this.row);
    return this.build();
  }
}
