import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { ParkingPhotoRepository } from '../../../application/gateway/ParkingPhoto.repository';
import { ParkingPhotoRecord } from '../../../domain/types/parking-photo.types';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { parkingPhotos, parkings } from '../drizzle/schema';

/**
 * The photo ledger and the parking's display list (`parkings.photos`) change together, in one
 * transaction: readers keep using the list, the ledger knows who posted what.
 */
@Injectable()
export class DrizzleParkingPhotoRepository implements ParkingPhotoRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findByParkingId(parkingId: string): Promise<ParkingPhotoRecord[]> {
    const rows = await this.drizzleService.db
      .select({ photo: parkingPhotos })
      .from(parkingPhotos)
      .innerJoin(parkings, eq(parkings.id, parkingPhotos.parkingId))
      .where(eq(parkingPhotos.parkingId, parkingId))
      .orderBy(
        sql`array_position(${parkings.photos}, ${parkingPhotos.url})`,
        parkingPhotos.createdAt,
      );
    return rows.map((row) => row.photo);
  }

  async findById(id: string): Promise<ParkingPhotoRecord | null> {
    const [row] = await this.drizzleService.db
      .select()
      .from(parkingPhotos)
      .where(eq(parkingPhotos.id, id))
      .limit(1);
    return row ?? null;
  }

  async add(
    parkingId: string,
    photos: ReadonlyArray<ParkingPhotoRecord>,
    maxPhotos: number,
  ): Promise<boolean> {
    if (photos.length === 0) return true;

    return this.drizzleService.db.transaction(async (tx) => {
      // Lock the parking: two people adding at once cannot go over the limit.
      const { rows } = await tx.execute<{ count: number }>(sql`
        SELECT COALESCE(array_length(photos, 1), 0)::int AS count
        FROM parkings WHERE id = ${parkingId} FOR UPDATE
      `);
      const current = rows[0];
      if (!current || current.count + photos.length > maxPhotos) return false;

      await tx.insert(parkingPhotos).values([...photos]);
      const urls = sql.join(
        photos.map((photo) => sql`${photo.url}`),
        sql`, `,
      );
      await tx
        .update(parkings)
        .set({
          photos: sql`COALESCE(${parkings.photos}, '{}'::text[]) || ARRAY[${urls}]::text[]`,
        })
        .where(eq(parkings.id, parkingId));
      return true;
    });
  }

  async remove(photo: ParkingPhotoRecord): Promise<void> {
    await this.drizzleService.db.transaction(async (tx) => {
      await tx.delete(parkingPhotos).where(eq(parkingPhotos.id, photo.id));
      await tx
        .update(parkings)
        .set({ photos: sql`array_remove(${parkings.photos}, ${photo.url})` })
        .where(eq(parkings.id, photo.parkingId));
    });
  }
}
