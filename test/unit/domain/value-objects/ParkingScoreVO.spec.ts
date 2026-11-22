import { ParkingScoreVO } from '../../../../src/domain/value-objects/ParkingScore.vo';
import {
  MODERATION_THRESHOLD,
  VERIFIED_THRESHOLD,
} from '../../../../src/domain/constants/parking.constants';
import { InvalidParkingScoreException } from '../../../../src/domain/exceptions/InvalidParkingScore.exception';

describe('ParkingScoreVO', () => {
  describe('create', () => {
    it('should create a valid score', () => {
      const score = ParkingScoreVO.create(10, 2);
      expect(score.upvotes).toBe(10);
      expect(score.downvotes).toBe(2);
    });

    it('should accept zeros', () => {
      const score = ParkingScoreVO.create(0, 0);
      expect(score.upvotes).toBe(0);
      expect(score.downvotes).toBe(0);
    });

    it('should throw if upvotes are negative', () => {
      expect(() => ParkingScoreVO.create(-1, 0)).toThrow(
        InvalidParkingScoreException,
      );
    });

    it('should throw if downvotes are negative', () => {
      expect(() => ParkingScoreVO.create(0, -1)).toThrow(
        InvalidParkingScoreException,
      );
    });
  });

  describe('netScore', () => {
    it('should return upvotes minus downvotes', () => {
      expect(ParkingScoreVO.create(15, 4).netScore).toBe(11);
    });

    it('should return a negative netScore when downvotes exceed upvotes', () => {
      expect(ParkingScoreVO.create(1, 8).netScore).toBe(-7);
    });

    it('should return 0 when upvotes equal downvotes', () => {
      expect(ParkingScoreVO.create(5, 5).netScore).toBe(0);
    });
  });

  describe('needsModeration', () => {
    it('should be false when netScore is above the threshold', () => {
      const score = ParkingScoreVO.create(0, 4);
      expect(score.needsModeration).toBe(false);
    });

    it(`should be true when netScore equals MODERATION_THRESHOLD (${MODERATION_THRESHOLD})`, () => {
      const downvotes = Math.abs(MODERATION_THRESHOLD);
      const score = ParkingScoreVO.create(0, downvotes);
      expect(score.needsModeration).toBe(true);
    });

    it('should be true when netScore is below the threshold', () => {
      const score = ParkingScoreVO.create(0, 10);
      expect(score.needsModeration).toBe(true);
    });
  });

  describe('isVerified', () => {
    it('should be false when netScore is below the threshold', () => {
      const score = ParkingScoreVO.create(5, 0);
      expect(score.isVerified).toBe(false);
    });

    it(`should be false when netScore equals VERIFIED_THRESHOLD (${VERIFIED_THRESHOLD})`, () => {
      const score = ParkingScoreVO.create(VERIFIED_THRESHOLD, 0);
      expect(score.isVerified).toBe(false);
    });

    it('should be true when netScore exceeds the threshold', () => {
      const score = ParkingScoreVO.create(VERIFIED_THRESHOLD + 1, 0);
      expect(score.isVerified).toBe(true);
    });
  });
});
