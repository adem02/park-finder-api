import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteType } from '../../../domain/types/vote.types';

export class VoteQueryDto {
  @ApiProperty({ enum: VoteType, example: VoteType.UPVOTE })
  @IsEnum(VoteType)
  type: VoteType;
}
