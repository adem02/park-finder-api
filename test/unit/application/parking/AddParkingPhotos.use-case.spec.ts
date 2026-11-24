import { AddParkingPhotosUseCase } from '../../../../src/application/parking/AddParkingPhotos.use-case';
import type {
  ParkingPhotoRepository,
  ParkingRepository,
  StorageService,
} from '../../../../src/application/gateway';
import type { AwardPointsUseCase } from '../../../../src/application/points/AwardPoints.use-case';
import { Parking } from '../../../../src/domain/entities/Parking';
import { User } from '../../../../src/domain/entities/User';
import { CoordinatesVO } from '../../../../src/domain/value-objects/Coordinates.vo';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { NoPhotoProvidedException } from '../../../../src/domain/exceptions/NoPhotoProvided.exception';
import { ParkingPhotosFullException } from '../../../../src/domain/exceptions/ParkingPhotosFull.exception';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';

const photo = (name: string) => ({
  buffer: Buffer.from(name),
  mimetype: 'image/jpeg',
  originalname: `${name}.jpg`,
  size: 10,
});

const makeParking = (photos: string[] = []) =>
  Parking.reconstitute({
    id: 'parking-1',
    name: 'Parking Centrale',
    totalSpots: 50,
    photos,
    coordinates: CoordinatesVO.reconstruct(49.25, 4.03),
    addedBy: User.reconstitute({
      id: 'system-placegratos',
      username: 'PlaceGratos',
      pointsBalance: PointsBalanceVO.create(0),
      createdAt: new Date(),
    }),
    createdAt: new Date(),
  });

function makeUseCase(
  options: {
    parking?: Parking | null;
    added?: boolean;
    uploaded?: string[];
  } = {},
) {
  const parkingRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(
        options.parking === undefined ? makeParking() : options.parking,
      ),
  } as unknown as jest.Mocked<ParkingRepository>;
  const parkingPhotoRepository = {
    add: jest.fn().mockResolvedValue(options.added ?? true),
  } as unknown as jest.Mocked<ParkingPhotoRepository>;
  const storageService = {
    uploadMany: jest
      .fn()
      .mockResolvedValue(options.uploaded ?? ['https://cdn/a.jpg']),
    deleteMany: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StorageService>;
  const awardPointsUseCase = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AwardPointsUseCase>;

  const useCase = new AddParkingPhotosUseCase(
    parkingRepository,
    parkingPhotoRepository,
    storageService,
    awardPointsUseCase,
  );
  return {
    useCase,
    parkingPhotoRepository,
    storageService,
    awardPointsUseCase,
  };
}

describe('AddParkingPhotosUseCase', () => {
  it('uploads, records the photos with 5 points each and awards them', async () => {
    const { useCase, parkingPhotoRepository, awardPointsUseCase } = makeUseCase(
      {
        uploaded: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
      },
    );

    const response = await useCase.execute({
      parkingId: 'parking-1',
      userId: 'user-1',
      photos: [photo('a'), photo('b')],
    });

    expect(response.photos.map((p) => p.url)).toEqual([
      'https://cdn/a.jpg',
      'https://cdn/b.jpg',
    ]);
    const [, records, max] = parkingPhotoRepository.add.mock.calls[0];
    expect(max).toBe(3);
    expect(records).toEqual([
      expect.objectContaining({
        url: 'https://cdn/a.jpg',
        addedById: 'user-1',
        awardedPoints: 5,
      }),
      expect.objectContaining({
        url: 'https://cdn/b.jpg',
        addedById: 'user-1',
        awardedPoints: 5,
      }),
    ]);
    expect(awardPointsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(awardPointsUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'PHOTO_ADDED',
    });
  });

  it('refuses before uploading when it would exceed 3 photos', async () => {
    const { useCase, storageService } = makeUseCase({
      parking: makeParking(['https://cdn/1.jpg', 'https://cdn/2.jpg']),
    });

    await expect(
      useCase.execute({
        parkingId: 'parking-1',
        userId: 'user-1',
        photos: [photo('a'), photo('b')],
      }),
    ).rejects.toThrow(ParkingPhotosFullException);
    expect(storageService.uploadMany).not.toHaveBeenCalled();
  });

  it('cleans up the upload and awards nothing when the parking filled up meanwhile', async () => {
    const { useCase, storageService, awardPointsUseCase } = makeUseCase({
      added: false,
    });

    await expect(
      useCase.execute({
        parkingId: 'parking-1',
        userId: 'user-1',
        photos: [photo('a')],
      }),
    ).rejects.toThrow(ParkingPhotosFullException);
    expect(storageService.deleteMany).toHaveBeenCalledWith([
      'https://cdn/a.jpg',
    ]);
    expect(awardPointsUseCase.execute).not.toHaveBeenCalled();
  });

  it('requires at least one photo', async () => {
    const { useCase } = makeUseCase();

    await expect(
      useCase.execute({ parkingId: 'parking-1', userId: 'user-1', photos: [] }),
    ).rejects.toThrow(NoPhotoProvidedException);
  });

  it('throws when the parking does not exist', async () => {
    const { useCase } = makeUseCase({ parking: null });

    await expect(
      useCase.execute({
        parkingId: 'ghost',
        userId: 'user-1',
        photos: [photo('a')],
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
