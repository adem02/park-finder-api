import {
  AVAILABILITY_EXPIRY_MINUTES,
  AVAILABILITY_RECENT_MINUTES,
} from '../constants/availability.constants';
import { AvailabilityStatus } from '../types/availability.types';

export class AvailabilityWindowVO {
  private constructor(
    readonly reportedAt: Date,
    readonly expiresAt: Date,
  ) {}

  static create(reportedAt: Date): AvailabilityWindowVO {
    const expiry = new Date(
      reportedAt.getTime() + AVAILABILITY_EXPIRY_MINUTES * 60 * 1000,
    );

    return new AvailabilityWindowVO(reportedAt, expiry);
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isRecent(): boolean {
    const tenMinutesAgo = new Date(
      Date.now() - AVAILABILITY_RECENT_MINUTES * 60 * 1000,
    );

    return this.reportedAt > tenMinutesAgo;
  }

  get status(): AvailabilityStatus {
    if (this.isExpired) return 'expired';

    if (this.isRecent) return 'recent';

    return 'old';
  }
}
