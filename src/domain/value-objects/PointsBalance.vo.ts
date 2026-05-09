import { POINTS_PER_ACTION } from '../constants/points.contants';
import { InvalidPointsBalanceException } from '../exceptions/InvalidPointsBalance.exception';
import { PointsAction } from '../types/points.types';

export class PointsBalanceVO {
  private constructor(private _points: number) {}

  static create(points: number): PointsBalanceVO {
    if (points < 0)
      throw new InvalidPointsBalanceException(
        'Points balance cannot be negative.',
      );

    return new PointsBalanceVO(points);
  }

  addPoints(action: PointsAction): PointsBalanceVO {
    const points = POINTS_PER_ACTION[action];

    return new PointsBalanceVO(this._points + points);
  }

  get points() {
    return this._points;
  }

  get level() {
    return Math.floor(this._points / 100);
  }

  get nextLevelThreshold(): number {
    return (this.level + 1) * 100;
  }

  get progressToNextLevel(): number {
    return this._points % 100;
  }

  get pointsToNextLevel(): number {
    return this.nextLevelThreshold - this._points;
  }
}
