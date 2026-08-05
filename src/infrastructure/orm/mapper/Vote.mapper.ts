import { UserMapper } from './User.mapper';
import { User } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';
import { ParkingMapper } from './Parking.mapper';
import { Parking } from '../../../domain/entities/Parking';
import { Vote } from '../../../domain/entities/Vote';
import { VoteType } from '../../../domain/types/vote.types';

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

interface VoteModel {
  id: string;
  parkingId: string;
  votedById: string;
  voteType: string;
  createdAt: Date;
  updatedAt: Date | null;
  votedBy?: UserModel | null;
  parking?: ParkingModel | null;
}

export class VoteMapper {
  static toDomain(model: VoteModel) {
    const votedBy = model.votedBy
      ? UserMapper.toDomain(model.votedBy)
      : User.reconstitute({
          id: model.votedById,
          username: '',
          pointsBalance: PointsBalanceVO.create(0),
          createdAt: new Date(),
        });

    const parking = model.parking
      ? ParkingMapper.toDomain(model.parking)
      : Parking.placeholder(model.parkingId, votedBy);

    return Vote.create({
      id: model.id,
      parking,
      votedBy,
      voteType: model.voteType as VoteType,
      createdAt: model.createdAt,
    });
  }
}
