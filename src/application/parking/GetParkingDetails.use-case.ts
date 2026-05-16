import { Inject, Injectable } from '@nestjs/common';
import { PARKING_REPOSITORY } from '../../common/constants/injection-tokens.constants';
import type { ParkingRepository } from '../gateway';
import { Parking } from '../../domain/entities/Parking';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';

export interface GetParkingDetailsRequest {
  id: string;
}

export interface GetParkingDetailsResponse {
  parking: Parking;
}

@Injectable()
export class GetParkingDetailsUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkingRepository: ParkingRepository,
  ) {}

  async execute(
    request: GetParkingDetailsRequest,
  ): Promise<GetParkingDetailsResponse> {
    const parking = await this.parkingRepository.findById(request.id);

    if (!parking) {
      throw new ResourceNotFoundException(
        `Parking with id ${request.id} not found.`,
      );
    }

    return { parking };
  }
}
