import { AvailabilityWindowVO } from '../../../../src/domain/value-objects/AvailabilityWindow.vo';
import {
  AVAILABILITY_EXPIRY_MINUTES,
  AVAILABILITY_RECENT_MINUTES,
} from '../../../../src/domain/constants/availability.constants';

const minutesAgo = (minutes: number): Date =>
  new Date(Date.now() - minutes * 60 * 1000);

describe('AvailabilityWindowVO', () => {
  describe('create', () => {
    it('should set reportedAt to the given date', () => {
      const now = new Date();
      const window = AvailabilityWindowVO.create(now);
      expect(window.reportedAt).toBe(now);
    });

    it(`should set expiresAt to reportedAt + ${AVAILABILITY_EXPIRY_MINUTES} minutes`, () => {
      const reportedAt = new Date();
      const window = AvailabilityWindowVO.create(reportedAt);
      const expectedExpiry = new Date(
        reportedAt.getTime() + AVAILABILITY_EXPIRY_MINUTES * 60 * 1000,
      );
      expect(window.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('isExpired', () => {
    it('should be false when reported just now', () => {
      const window = AvailabilityWindowVO.create(new Date());
      expect(window.isExpired).toBe(false);
    });

    it(`should be false when reported ${AVAILABILITY_EXPIRY_MINUTES - 1} minutes ago`, () => {
      const window = AvailabilityWindowVO.create(
        minutesAgo(AVAILABILITY_EXPIRY_MINUTES - 1),
      );
      expect(window.isExpired).toBe(false);
    });

    it(`should be true when reported more than ${AVAILABILITY_EXPIRY_MINUTES} minutes ago`, () => {
      const window = AvailabilityWindowVO.create(
        minutesAgo(AVAILABILITY_EXPIRY_MINUTES + 1),
      );
      expect(window.isExpired).toBe(true);
    });
  });

  describe('isRecent', () => {
    it('should be true when reported just now', () => {
      const window = AvailabilityWindowVO.create(new Date());
      expect(window.isRecent).toBe(true);
    });

    it(`should be true when reported ${AVAILABILITY_RECENT_MINUTES - 1} minutes ago`, () => {
      const window = AvailabilityWindowVO.create(
        minutesAgo(AVAILABILITY_RECENT_MINUTES - 1),
      );
      expect(window.isRecent).toBe(true);
    });

    it(`should be false when reported more than ${AVAILABILITY_RECENT_MINUTES} minutes ago`, () => {
      const window = AvailabilityWindowVO.create(
        minutesAgo(AVAILABILITY_RECENT_MINUTES + 1),
      );
      expect(window.isRecent).toBe(false);
    });
  });

  describe('status', () => {
    it('should return "recent" when reported just now', () => {
      const window = AvailabilityWindowVO.create(new Date());
      expect(window.status).toBe('recent');
    });

    it('should return "old" when not recent but not yet expired', () => {
      const window = AvailabilityWindowVO.create(
        minutesAgo(AVAILABILITY_RECENT_MINUTES + 1),
      );
      expect(window.status).toBe('old');
    });

    it('should return "expired" when past expiry', () => {
      const window = AvailabilityWindowVO.create(
        minutesAgo(AVAILABILITY_EXPIRY_MINUTES + 1),
      );
      expect(window.status).toBe('expired');
    });

    it('should prioritize "expired" over "old"', () => {
      const window = AvailabilityWindowVO.create(minutesAgo(60));
      expect(window.status).toBe('expired');
    });
  });
});
