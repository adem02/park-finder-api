import { IsEnum } from 'class-validator';
import { VoteType } from '../../../domain/types/vote.types';

export class VoteQueryDto {
  @IsEnum(VoteType)
  type: VoteType;
}
