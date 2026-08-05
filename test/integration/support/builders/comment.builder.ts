import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { comments } from '../../../../src/infrastructure/orm/drizzle/schema';
import { ParkingBuilder } from './parking.builder';
import { UserBuilder } from './user.builder';

export interface CommentRow {
  id: string;
  content: string;
  parkingId: string;
  authorId: string;
  createdAt: Date;
}

/**
 * Builder for the `comments` table. Auto-creates a default parking and
 * author if not provided.
 */
export class CommentBuilder {
  private row: CommentRow;

  constructor(private readonly drizzleService: DrizzleService) {
    this.row = {
      id: randomUUID(),
      content: 'Great parking spot!',
      parkingId: '',
      authorId: '',
      createdAt: new Date(),
    };
  }

  withContent(content: string): this {
    this.row.content = content;
    return this;
  }

  forParking(parkingId: string): this {
    this.row.parkingId = parkingId;
    return this;
  }

  writtenBy(userId: string): this {
    this.row.authorId = userId;
    return this;
  }

  createdAt(createdAt: Date): this {
    this.row.createdAt = createdAt;
    return this;
  }

  build(): CommentRow {
    return { ...this.row };
  }

  async create(): Promise<CommentRow> {
    if (!this.row.parkingId) {
      const parking = await new ParkingBuilder(this.drizzleService).create();
      this.row.parkingId = parking.id;
    }
    if (!this.row.authorId) {
      const user = await new UserBuilder(this.drizzleService).create();
      this.row.authorId = user.id;
    }
    await this.drizzleService.db.insert(comments).values(this.row);
    return this.build();
  }
}
