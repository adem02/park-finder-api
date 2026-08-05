import { Comment } from '../../../domain/entities/Comment';
import { User } from '../../../domain/entities/User';
import { Parking } from '../../../domain/entities/Parking';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';
import { UserMapper } from './User.mapper';
import { ParkingMapper } from './Parking.mapper';

interface UserModel {
  id: string;
  username: string;
  email: string | null;
  points: number;
  createdAt: Date;
  updatedAt: Date | null;
}

interface ParkingModel {
  id: string;
  name: string;
  totalSpots: number;
  photos: string[] | null;
  latitude: number;
  longitude: number;
  addedById: string;
  createdAt: Date;
  updatedAt: Date | null;
  addedBy?: UserModel | null;
}

interface CommentModel {
  id: string;
  content: string;
  parkingId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date | null;
  author?: UserModel | null;
  parking?: ParkingModel | null;
}

export class CommentMapper {
  static toDomain(model: CommentModel): Comment {
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
