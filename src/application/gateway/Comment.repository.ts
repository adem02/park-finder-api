import { Comment } from '../../domain/entities/Comment';

export interface CommentCursor {
  createdAt: Date;
  id: string;
}

export interface CommentRepository {
  findRecentByParkingId(parkingId: string, limit: number): Promise<Comment[]>;
  findPageByParkingId(
    parkingId: string,
    cursor: CommentCursor | null,
    limit: number,
  ): Promise<Comment[]>;
  create(comment: Comment): Promise<void>;
}
