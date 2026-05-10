import { Comment } from '../../domain/entities/Comment';

export interface CommentRepository {
  findByParkingId(parkingId: string): Promise<Comment[]>;
  create(comment: Comment): Promise<void>;
  updateById(id: string, updatedComment: Comment): Promise<void>;
  deleteById(id: string): Promise<void>;
}
