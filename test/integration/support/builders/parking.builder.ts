import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { parkings } from '../../../../src/infrastructure/orm/drizzle/schema';
import { UserBuilder } from './user.builder';

export interface ParkingRow {
  id: string;
  name: string;
  totalSpots: number;
  photos: string[] | null;
  latitude: number;
  longitude: number;
  addedById: string;
  createdAt: Date;
}

// Reims city center — keeps default test data realistic for a France-only app.
const DEFAULT_LATITUDE = 49.2583;
const DEFAULT_LONGITUDE = 4.0317;

/**
 * Builder for the `parkings` table. Auto-creates a default `addedBy` User if
 * not provided, and replicates the same two-step insert + PostGIS
 * ST_SetSRID/ST_MakePoint update used by DrizzleParkingRepository.create().
 */
export class ParkingBuilder {
  private row: ParkingRow;

  constructor(private readonly drizzleService: DrizzleService) {
    this.row = {
      id: randomUUID(),
      name: `Parking ${randomUUID().slice(0, 8)}`,
      totalSpots: 50,
      photos: null,
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      addedById: '',
      createdAt: new Date(),
    };
  }

  withId(id: string): this {
    this.row.id = id;
    return this;
  }

  withName(name: string): this {
    this.row.name = name;
    return this;
  }

  withTotalSpots(totalSpots: number): this {
    this.row.totalSpots = totalSpots;
    return this;
  }

  withCoordinates(latitude: number, longitude: number): this {
    this.row.latitude = latitude;
    this.row.longitude = longitude;
    return this;
  }

  addedBy(userId: string): this {
    this.row.addedById = userId;
    return this;
  }

  build(): ParkingRow {
    return { ...this.row };
  }

  async create(): Promise<ParkingRow> {
    if (!this.row.addedById) {
      const user = await new UserBuilder(this.drizzleService).create();
      this.row.addedById = user.id;
    }

    await this.drizzleService.db.transaction(async (tx) => {
      await tx.insert(parkings).values(this.row);
      await tx.execute(sql`
        UPDATE parkings
        SET location = ST_SetSRID(ST_MakePoint(${this.row.longitude}, ${this.row.latitude}), 4326)::geography
        WHERE id = ${this.row.id}
      `);
    });

    return this.build();
  }
}
