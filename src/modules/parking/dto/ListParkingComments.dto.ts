import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CommentCursor } from '../../../application/gateway/Comment.repository';
import { ListParkingCommentsResponse } from '../../../application/comment/ListParkingComments.use-case';
import {
  COMMENTS_PAGE_DEFAULT_LIMIT,
  COMMENTS_PAGE_MAX_LIMIT,
} from '../../../domain/constants/comment.constants';
import { CommentResponseDto } from './Comment.dto';

export function encodeCommentCursor(cursor: CommentCursor): string {
  const raw = `${cursor.createdAt.toISOString()}|${cursor.id}`;
  return Buffer.from(raw, 'utf-8').toString('base64url');
}

export function decodeCommentCursor(token: string): CommentCursor | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const separatorIndex = raw.indexOf('|');
    if (separatorIndex <= 0) {
      return null;
    }

    const iso = raw.slice(0, separatorIndex);
    const id = raw.slice(separatorIndex + 1);
    const createdAt = new Date(iso);

    if (Number.isNaN(createdAt.getTime()) || !id) {
      return null;
    }

    return { createdAt, id };
  } catch {
    return null;
  }
}

export class ListParkingCommentsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    default: COMMENTS_PAGE_DEFAULT_LIMIT,
    minimum: 1,
    maximum: COMMENTS_PAGE_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(COMMENTS_PAGE_MAX_LIMIT)
  limit?: number;
}

export class ListParkingCommentsOutputDTO {
  @ApiProperty({ type: [CommentResponseDto] })
  readonly items: CommentResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  readonly nextCursor: string | null;

  constructor(response: ListParkingCommentsResponse) {
    this.items = response.items.map(
      (comment) => new CommentResponseDto(comment),
    );
    this.nextCursor = response.nextCursor
      ? encodeCommentCursor(response.nextCursor)
      : null;
  }
}
