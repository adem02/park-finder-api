import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { users } from '../../../../src/infrastructure/orm/drizzle/schema';

export interface UserRow {
  id: string;
  username: string;
  email: string | null;
  points: number;
  createdAt: Date;
}

/**
 * Builder for the `users` table. Comes with sensible random defaults so
 * tests only need to override what actually matters for the scenario.
 */
export class UserBuilder {
  private row: UserRow;

  constructor(private readonly drizzleService: DrizzleService) {
    const suffix = randomUUID().slice(0, 8);
    this.row = {
      id: randomUUID(),
      username: `user-${suffix}`,
      email: `user-${suffix}@test.local`,
      points: 0,
      createdAt: new Date(),
    };
  }

  withId(id: string): this {
    this.row.id = id;
    return this;
  }

  withUsername(username: string): this {
    this.row.username = username;
    return this;
  }

  withEmail(email: string | null): this {
    this.row.email = email;
    return this;
  }

  withPoints(points: number): this {
    this.row.points = points;
    return this;
  }

  build(): UserRow {
    return { ...this.row };
  }

  async create(): Promise<UserRow> {
    await this.drizzleService.db.insert(users).values(this.row);
    return this.build();
  }
}
