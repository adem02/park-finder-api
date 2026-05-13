import { User as DomainUser } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';
import { User as ModelUser } from '../prisma/generated/client';

export class UserMapper {
  static toDomain(model: ModelUser): DomainUser {
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
