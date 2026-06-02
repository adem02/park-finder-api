import { Injectable } from '@nestjs/common';
import { CommentCursor, CommentRepository } from '../../../application/gateway';
import { Comment } from '../../../domain/entities/Comment';
import { PrismaService } from '../prisma/Prisma.service';
import { CommentMapper } from '../mapper/Comment.mapper';

@Injectable()
export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findRecentByParkingId(
    parkingId: string,
    limit: number,
  ): Promise<Comment[]> {
    const comments = await this.prismaService.comment.findMany({
      where: { parkingId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: { author: true },
    });

    return comments.map((comment) => CommentMapper.toDomain(comment));
  }

  async findPageByParkingId(
    parkingId: string,
    cursor: CommentCursor | null,
    limit: number,
  ): Promise<Comment[]> {
    const comments = await this.prismaService.comment.findMany({
      where: {
        parkingId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  AND: [
                    { createdAt: cursor.createdAt },
                    { id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: { author: true },
    });

    return comments.map((comment) => CommentMapper.toDomain(comment));
  }

  async create(comment: Comment): Promise<void> {
    await this.prismaService.comment.create({
      data: {
        id: comment.id,
        content: comment.content,
        parkingId: comment.parking.id,
        authorId: comment.author.id,
        createdAt: comment.createdAt,
      },
    });
  }
}
