import { eq } from 'drizzle-orm';
import { DrizzleParkingPhotoRepository } from '../../src/infrastructure/orm/repositories/DrizzleParkingPhoto.repository';
import { DrizzleParkingRepository } from '../../src/infrastructure/orm/repositories/DrizzleParking.repository';
import {
  parkingPhotos,
  parkings,
} from '../../src/infrastructure/orm/drizzle/schema';
import { Parking } from '../../src/domain/entities/Parking';
import { User } from '../../src/domain/entities/User';
import { CoordinatesVO } from '../../src/domain/value-objects/Coordinates.vo';
import { PointsBalanceVO } from '../../src/domain/value-objects/PointsBalance.vo';
import type { ParkingPhotoRecord } from '../../src/domain/types/parking-photo.types';
import {
  createTestDatabase,
  TestDatabase,
} from './support/database/create-test-database';
import { resetDatabase } from './support/database/reset-database';
import { TestDataFactory } from './support/factories/test-data.factory';

describe('DrizzleParkingPhotoRepository (integration)', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let repository: DrizzleParkingPhotoRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    factory = new TestDataFactory(testDb.drizzleService);
    repository = new DrizzleParkingPhotoRepository(testDb.drizzleService);
  });

  afterEach(async () => {
    await resetDatabase(testDb.drizzleService);
  });

  afterAll(async () => {
    await testDb.stop();
  });

  const photoOf = (
    parkingId: string,
    addedById: string,
    url: string,
    createdAt = new Date(),
  ): ParkingPhotoRecord => ({
    id: `ph-${url}`,
    parkingId,
    url,
    addedById,
    awardedPoints: 5,
    createdAt,
  });

  const displayList = async (parkingId: string) => {
    const [row] = await testDb.drizzleService.db
      .select({ photos: parkings.photos })
      .from(parkings)
      .where(eq(parkings.id, parkingId));
    return row.photos ?? [];
  };

  it('adds photos to the ledger and to the display list, in order', async () => {
    const user = await factory.user().create();
    const parking = await factory.parking().create();

    const added = await repository.add(
      parking.id,
      [photoOf(parking.id, user.id, 'a'), photoOf(parking.id, user.id, 'b')],
      3,
    );

    expect(added).toBe(true);
    expect(await displayList(parking.id)).toEqual(['a', 'b']);
    const photos = await repository.findByParkingId(parking.id);
    expect(photos.map((p) => [p.url, p.addedById, p.awardedPoints])).toEqual([
      ['a', user.id, 5],
      ['b', user.id, 5],
    ]);
  });

  it('adds nothing when it would go over the limit', async () => {
    const user = await factory.user().create();
    const parking = await factory.parking().create();
    await repository.add(
      parking.id,
      [photoOf(parking.id, user.id, 'a'), photoOf(parking.id, user.id, 'b')],
      3,
    );

    const added = await repository.add(
      parking.id,
      [photoOf(parking.id, user.id, 'c'), photoOf(parking.id, user.id, 'd')],
      3,
    );

    expect(added).toBe(false);
    expect(await displayList(parking.id)).toEqual(['a', 'b']);
    expect(await repository.findByParkingId(parking.id)).toHaveLength(2);
  });

  it('never goes over the limit when two people add at the same time', async () => {
    const user = await factory.user().create();
    const parking = await factory.parking().create();

    const results = await Promise.all([
      repository.add(
        parking.id,
        [photoOf(parking.id, user.id, 'a'), photoOf(parking.id, user.id, 'b')],
        3,
      ),
      repository.add(
        parking.id,
        [photoOf(parking.id, user.id, 'c'), photoOf(parking.id, user.id, 'd')],
        3,
      ),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await displayList(parking.id)).toHaveLength(2);
  });

  it('removes a photo from the ledger and from the display list', async () => {
    const user = await factory.user().create();
    const parking = await factory.parking().create();
    await repository.add(
      parking.id,
      [photoOf(parking.id, user.id, 'a'), photoOf(parking.id, user.id, 'b')],
      3,
    );
    const [first] = await repository.findByParkingId(parking.id);

    await repository.remove(first);

    expect(await displayList(parking.id)).toEqual(['b']);
    expect(await repository.findById(first.id)).toBeNull();
  });

  it('records the photos posted with a new parking, worth no points', async () => {
    const author = await factory.user().create();
    const parkingRepository = new DrizzleParkingRepository(
      testDb.drizzleService,
    );
    const parking = Parking.create({
      id: 'new-parking',
      name: 'Parking neuf',
      totalSpots: 10,
      photos: [],
      coordinates: CoordinatesVO.create(49.25, 4.03),
      addedBy: User.reconstitute({
        id: author.id,
        username: author.username,
        pointsBalance: PointsBalanceVO.create(0),
        createdAt: new Date(),
      }),
      createdAt: new Date(),
    }).addPhotos(['https://cdn/creation.jpg']);

    await parkingRepository.create(parking);

    const rows = await testDb.drizzleService.db
      .select()
      .from(parkingPhotos)
      .where(eq(parkingPhotos.parkingId, 'new-parking'));
    expect(rows).toEqual([
      expect.objectContaining({
        url: 'https://cdn/creation.jpg',
        addedById: author.id,
        awardedPoints: 0,
      }),
    ]);
  });
});
