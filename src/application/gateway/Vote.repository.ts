import { Vote } from '../../domain/entities/Vote';

export interface VoteRepository {
  findByParkingIdAndUserId(
    parkingId: string,
    userId: string,
  ): Promise<Vote | null>;
  findByParkingId(parkingId: string): Promise<Vote[]>;
  create(vote: Vote): Promise<void>;
  update(updatedVote: Vote): Promise<void>;
  cancelByParkingIdAndUserId(parkingId: string, userId: string): Promise<void>;
}
