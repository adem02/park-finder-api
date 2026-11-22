import { Injectable } from '@nestjs/common';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { CommentCursor, CommentRepository } from '../../../application/gateway';
import { Comment } from '../../../domain/entities/Comment';
import { DrizzleService } from '../drizzle/Drizzle.service';
import { comments, users } from '../drizzle/schema';
import { CommentMapper } from '../mapper/Comment.mapper';

@Injectable()
export class DrizzleCommentRepository implements CommentRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findRecentByParkingId(
    parkingId: string,
    limit: number,
  ): Promise<Comment[]> {
    const rows = await this.drizzleService.db
      .select({ comment: comments, author: users })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.parkingId, parkingId))
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(limit);

    return rows.map((row) =>
      CommentMapper.toDomain({ ...row.comment, author: row.author }),
    );
  }

  async findPageByParkingId(
    parkingId: string,
    cursor: CommentCursor | null,
    limit: number,
  ): Promise<Comment[]> {
    const rows = await this.drizzleService.db
      .select({ comment: comments, author: users })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(
        cursor
          ? and(
              eq(comments.parkingId, parkingId),
              or(
                lt(comments.createdAt, cursor.createdAt),
                and(
                  eq(comments.createdAt, cursor.createdAt),
                  lt(comments.id, cursor.id),
                ),
              ),
            )
          : eq(comments.parkingId, parkingId),
      )
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(limit);

    return rows.map((row) =>
      CommentMapper.toDomain({ ...row.comment, author: row.author }),
    );
  }

  async create(comment: Comment): Promise<void> {
    await this.drizzleService.db.insert(comments).values({
      id: comment.id,
      content: comment.content,
      parkingId: comment.parking.id,
      authorId: comment.author.id,
      createdAt: comment.createdAt,
    });
  }
}
