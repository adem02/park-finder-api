import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITY_REPOSITORY,
  PARKING_REPOSITORY,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import type {
  AvailabilityRepository,
  ParkingRepository,
  UserRepository,
} from '../gateway';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { AvailabilityReport } from '../../domain/entities/AvailabilityReport';
import { UuidGenerator } from '../../common/utils/UuidGenerator';
import { POINTS_PER_ACTION } from '../../domain/constants/points.contants';

export interface ReportAvailabilityRequest {
  parkingId: string;
  reporterId: string;
  availableSpots: number;
}

@Injectable()
export class ReportAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: AvailabilityRepository,
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(request: ReportAvailabilityRequest) {
    const [parking, user] = await Promise.all([
      this.parkingRepository.findById(request.parkingId),
      this.userRepository.findById(request.reporterId),
    ]);

    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with id: ${request.parkingId} not found`,
      );
    }

    if (!user) {
      throw new ResourceNotFoundException(
        `User with id: ${request.reporterId} not found`,
      );
    }

    const report = AvailabilityReport.create({
      id: UuidGenerator.Generate(),
      parking,
      reportedBy: user,
      availableSpots: request.availableSpots,
      reportedAt: new Date(),
    });

    await this.availabilityRepository.create(report);

    await this.userRepository.updatePointsById(
      request.reporterId,
      POINTS_PER_ACTION.AVAILABILITY_REPORTED,
    );
  }
}
