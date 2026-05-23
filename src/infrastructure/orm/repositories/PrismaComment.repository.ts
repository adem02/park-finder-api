import { Injectable } from '@nestjs/common';
import { CommentRepository } from '../../../application/gateway';
import { Comment } from '../../../domain/entities/Comment';
import { PrismaService } from '../prisma/Prisma.service';

@Injectable()
export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findByParkingId(_parkingId: string): Promise<Comment[]> {
    throw new Error('Method not implemented.');
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

  updateById(_id: string, _updatedComment: Comment): Promise<void> {
    throw new Error('Method not implemented.');
  }

  deleteById(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
