import {
  Comment as ModelComment,
  User as ModelUser,
  Parking as ModelParking,
} from '../prisma/generated/client';
import { Comment } from '../../../domain/entities/Comment';
import { User } from '../../../domain/entities/User';
import { Parking } from '../../../domain/entities/Parking';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';
import { UserMapper } from './User.mapper';
import { ParkingMapper } from './Parking.mapper';

type CommentWithRelations = ModelComment & {
  author?: ModelUser | null;
  parking?: ModelParking | null;
};

export class CommentMapper {
  static toDomain(model: CommentWithRelations): Comment {
    const author = model.author
      ? UserMapper.toDomain(model.author)
      : User.reconstitute({
          id: model.authorId,
          username: '',
          pointsBalance: PointsBalanceVO.create(0),
          createdAt: new Date(),
        });

    const parking = model.parking
      ? ParkingMapper.toDomain(model.parking)
      : Parking.placeholder(model.parkingId, author);

    return Comment.create({
      id: model.id,
      content: model.content,
      parking,
      author,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt ?? undefined,
    });
  }
}
