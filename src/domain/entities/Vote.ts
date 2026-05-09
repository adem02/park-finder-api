import { VoteType } from '../types/vote.types';
import { Parking } from './Parking';
import { User } from './User';

interface VoteParams {
  id: string;
  parking: Parking;
  votedBy: User;
  voteType: VoteType;
  createdAt: Date;
  updatedAt?: Date;
}

export class Vote {
  private constructor(
    readonly id: string,
    readonly parking: Parking,
    readonly votedBy: User,
    readonly voteType: VoteType,
    readonly createdAt: Date,
    readonly updatedAt?: Date,
  ) {}

  static create(params: VoteParams): Vote {
    return new Vote(
      params.id,
      params.parking,
      params.votedBy,
      params.voteType,
      params.createdAt,
      params.updatedAt,
    );
  }

  change(newType: VoteType): Vote {
    return new Vote(
      this.id,
      this.parking,
      this.votedBy,
      newType,
      this.createdAt,
      new Date(),
    );
  }
}
