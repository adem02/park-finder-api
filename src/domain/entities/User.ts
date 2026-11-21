import { PointsBalanceVO } from '../value-objects/PointsBalance.vo';
import { InvalidUsernameLengthException } from '../exceptions/InvalidUsernameLength.exception';
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../constants/user.constants';

interface UserParams {
  id: string;
  username: string;
  pointsBalance: PointsBalanceVO;
  createdAt: Date;
  updatedAt?: Date;
  email?: string;
  photoUrl?: string;
}

export class User {
  private constructor(
    readonly id: string,
    readonly username: string,
    readonly pointsBalance: PointsBalanceVO,
    readonly createdAt: Date,
    readonly updatedAt?: Date,
    readonly email?: string,
    readonly photoUrl?: string,
  ) {}

  static create(params: UserParams): User {
    if (
      params.username.length < USERNAME_MIN_LENGTH ||
      params.username.length > USERNAME_MAX_LENGTH
    ) {
      throw new InvalidUsernameLengthException(
        'Username must be between 3 and 50 characters.',
      );
    }

    return new User(
      params.id,
      params.username,
      params.pointsBalance,
      params.createdAt,
      params.updatedAt,
      params.email,
      params.photoUrl,
    );
  }

  static reconstitute(params: UserParams) {
    return new User(
      params.id,
      params.username,
      params.pointsBalance,
      params.createdAt,
      params.updatedAt,
      params.email,
      params.photoUrl,
    );
  }
}
