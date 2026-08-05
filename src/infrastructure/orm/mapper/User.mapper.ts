import { User as DomainUser } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';

interface UserModel {
  id: string;
  username: string;
  email: string | null;
  points: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export class UserMapper {
  static toDomain(model: UserModel): DomainUser {
    const pointsBalance = PointsBalanceVO.create(model.points);

    return DomainUser.reconstitute({
      id: model.id,
      username: model.username,
      email: model.email ?? undefined,
      pointsBalance,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt ?? undefined,
    });
  }
}
