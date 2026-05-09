import {
  MODERATION_THRESHOLD,
  VERIFIED_THRESHOLD,
} from '../constants/parking.constants';
import { InvalidParkingScoreException } from '../exceptions/InvalidParkingScore.exception';

export class ParkingScoreVO {
  private constructor(
    readonly upvotes: number,
    readonly downvotes: number,
  ) {}

  static create(upvotes: number, downvotes: number): ParkingScoreVO {
    if (upvotes < 0)
      throw new InvalidParkingScoreException('Upvotes cannot be negative.');
    if (downvotes < 0)
      throw new InvalidParkingScoreException('Downvotes cannot be negative.');

    return new ParkingScoreVO(upvotes, downvotes);
  }

  get netScore(): number {
    return this.upvotes - this.downvotes;
  }

  get needsModeration(): boolean {
    return this.netScore <= MODERATION_THRESHOLD;
  }

  get isVerified(): boolean {
    return this.netScore > VERIFIED_THRESHOLD;
  }
}
