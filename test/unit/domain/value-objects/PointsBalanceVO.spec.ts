import { POINTS_PER_ACTION } from '../../../../src/domain/constants/points.constants';
import { PointsBalanceVO } from '../../../../src/domain/value-objects/PointsBalance.vo';
import { InvalidPointsBalanceException } from '../../../../src/domain/exceptions/InvalidPointsBalance.exception';

describe('PointsBalanceVO', () => {
  describe('create', () => {
    it('should create a balance with valid points', () => {
      const balance = PointsBalanceVO.create(100);
      expect(balance.points).toBe(100);
    });

    it('should accept 0 points', () => {
      const balance = PointsBalanceVO.create(0);
      expect(balance.points).toBe(0);
    });

    it('should throw if points are negative', () => {
      expect(() => PointsBalanceVO.create(-1)).toThrow(
        InvalidPointsBalanceException,
      );
    });
  });

  describe('addPoints', () => {
    it('should add PARKING_ADDED points and return a new instance', () => {
      const balance = PointsBalanceVO.create(50);
      const result = balance.addPoints('PARKING_ADDED');
      expect(result.points).toBe(50 + POINTS_PER_ACTION.PARKING_ADDED);
    });

    it('should add AVAILABILITY_REPORTED points and return a new instance', () => {
      const balance = PointsBalanceVO.create(50);
      const result = balance.addPoints('AVAILABILITY_REPORTED');
      expect(result.points).toBe(50 + POINTS_PER_ACTION.AVAILABILITY_REPORTED);
    });

    it('should add VOTE_CAST points and return a new instance', () => {
      const balance = PointsBalanceVO.create(50);
      const result = balance.addPoints('VOTE_CAST');
      expect(result.points).toBe(50 + POINTS_PER_ACTION.VOTE_CAST);
    });

    it('should be immutable (original unchanged)', () => {
      const balance = PointsBalanceVO.create(50);
      balance.addPoints('PARKING_ADDED');
      expect(balance.points).toBe(50);
    });
  });

  describe('level', () => {
    it('should return 0 for points below 100', () => {
      expect(PointsBalanceVO.create(99).level).toBe(0);
    });

    it('should return 1 for exactly 100 points', () => {
      expect(PointsBalanceVO.create(100).level).toBe(1);
    });

    it('should return 1 for points between 100 and 199', () => {
      expect(PointsBalanceVO.create(150).level).toBe(1);
    });

    it('should return 3 for 350 points', () => {
      expect(PointsBalanceVO.create(350).level).toBe(3);
    });
  });

  describe('nextLevelThreshold', () => {
    it('should return 100 for level 0', () => {
      expect(PointsBalanceVO.create(50).nextLevelThreshold).toBe(100);
    });

    it('should return 200 for level 1', () => {
      expect(PointsBalanceVO.create(100).nextLevelThreshold).toBe(200);
    });
  });

  describe('progressToNextLevel', () => {
    it('should return the remainder of points divided by 100', () => {
      expect(PointsBalanceVO.create(150).progressToNextLevel).toBe(50);
    });

    it('should return 0 when points are an exact multiple of 100', () => {
      expect(PointsBalanceVO.create(200).progressToNextLevel).toBe(0);
    });
  });

  describe('pointsToNextLevel', () => {
    it('should return remaining points to reach next level', () => {
      expect(PointsBalanceVO.create(150).pointsToNextLevel).toBe(50);
    });

    it('should return 100 when at an exact level threshold', () => {
      expect(PointsBalanceVO.create(200).pointsToNextLevel).toBe(100);
    });
  });
});
