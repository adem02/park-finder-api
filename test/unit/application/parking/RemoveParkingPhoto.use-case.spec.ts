import { RemoveParkingPhotoUseCase } from '../../../../src/application/parking/RemoveParkingPhoto.use-case';
import type {
  LeaderboardRepository,
  ParkingPhotoRepository,
  StorageService,
  UserRepository,
} from '../../../../src/application/gateway';
import type { ParkingPhotoRecord } from '../../../../src/domain/types/parking-photo.types';
import { NotPhotoAuthorException } from '../../../../src/domain/exceptions/NotPhotoAuthor.exception';
import { ResourceNotFoundException } from '../../../../src/domain/exceptions/ResourceNotFound.exception';

const aPhoto = (
  overrides: Partial<ParkingPhotoRecord> = {},
): ParkingPhotoRecord => ({
  id: 'ph-1',
  parkingId: 'parking-1',
  url: 'https://cdn/a.jpg',
  addedById: 'user-1',
  awardedPoints: 5,
  createdAt: new Date('2026-10-20T10:00:00Z'),
  ...overrides,
});

function makeUseCase(photo: ParkingPhotoRecord | null) {
  const parkingPhotoRepository = {
    findById: jest.fn().mockResolvedValue(photo),
    remove: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ParkingPhotoRepository>;
  const userRepository = {
    withdrawPointsById: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<UserRepository>;
  const leaderboardRepository = {
    withdrawPoints: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<LeaderboardRepository>;
  const storageService = {
    deleteMany: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StorageService>;
  const useCase = new RemoveParkingPhotoUseCase(
    parkingPhotoRepository,
    userRepository,
    leaderboardRepository,
    storageService,
  );
  return {
    useCase,
    parkingPhotoRepository,
    userRepository,
    leaderboardRepository,
    storageService,
  };
}

const request = { parkingId: 'parking-1', photoId: 'ph-1', userId: 'user-1' };

describe('RemoveParkingPhotoUseCase', () => {
  it('removes the photo and takes back the points of the month it was posted', async () => {
    const {
      useCase,
      parkingPhotoRepository,
      userRepository,
      leaderboardRepository,
      storageService,
    } = makeUseCase(aPhoto());

    await useCase.execute(request);

    expect(parkingPhotoRepository.remove).toHaveBeenCalledWith(aPhoto());
    expect(userRepository.withdrawPointsById).toHaveBeenCalledWith('user-1', 5);
    expect(leaderboardRepository.withdrawPoints).toHaveBeenCalledWith(
      'user-1',
      5,
      '2026-10',
    );
    expect(storageService.deleteMany).toHaveBeenCalledWith([
      'https://cdn/a.jpg',
    ]);
  });

  it('takes back nothing for a photo posted with the parking', async () => {
    const { useCase, userRepository } = makeUseCase(
      aPhoto({ awardedPoints: 0 }),
    );

    await useCase.execute(request);

    expect(userRepository.withdrawPointsById).not.toHaveBeenCalled();
  });

  it('refuses anyone but the person who posted it', async () => {
    const { useCase, parkingPhotoRepository } = makeUseCase(
      aPhoto({ addedById: 'other' }),
    );

    await expect(useCase.execute(request)).rejects.toThrow(
      NotPhotoAuthorException,
    );
    expect(parkingPhotoRepository.remove).not.toHaveBeenCalled();
  });

  it('throws when the photo is unknown or on another parking', async () => {
    await expect(makeUseCase(null).useCase.execute(request)).rejects.toThrow(
      ResourceNotFoundException,
    );
    await expect(
      makeUseCase(aPhoto({ parkingId: 'elsewhere' })).useCase.execute(request),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
