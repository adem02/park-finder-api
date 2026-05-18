import {
  Vote as ModelVote,
  User as ModelUser,
  Parking as ModelParking,
} from '../prisma/generated/client';
import { UserMapper } from './User.mapper';
import { User } from '../../../domain/entities/User';
import { PointsBalanceVO } from '../../../domain/value-objects/PointsBalance.vo';
import { ParkingMapper } from './Parking.mapper';
import { Parking } from '../../../domain/entities/Parking';
import { Vote } from '../../../domain/entities/Vote';
import { VoteType } from '../../../domain/types/vote.types';

type VoteWithOptionalUserAndParking = ModelVote & {
  votedBy?: ModelUser | null;
  parking?: ModelParking | null;
};

export class VoteMapper {
  static toDomain(model: VoteWithOptionalUserAndParking) {
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
