import { Injectable } from '@nestjs/common';
import { VoteRepository } from '../../../application/gateway';
import { Vote } from '../../../domain/entities/Vote';
import { PrismaService } from '../prisma/Prisma.service';
import { VoteMapper } from '../mapper/Vote.mapper';
import { ResourceNotFoundException } from '../../../domain/exceptions/ResourceNotFound.exception';
import { Prisma } from '../prisma/generated/client';

@Injectable()
export class PrismaVoteRepository implements VoteRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByParkingIdAndUserId(
    parkingId: string,
    userId: string,
  ): Promise<Vote | null> {
    const vote = await this.prismaService.vote.findUnique({
      where: {
        parkingId_votedById: {
          parkingId,
          votedById: userId,
        },
      },
    });

    return vote !== null ? VoteMapper.toDomain(vote) : null;
  }

  findByParkingId(_parkingId: string): Promise<Vote[]> {
    throw new Error('Method not implemented.');
  }

  async create(vote: Vote): Promise<void> {
    await this.prismaService.vote.create({
      data: {
        id: vote.id,
        votedById: vote.votedBy.id,
        voteType: vote.voteType,
        parkingId: vote.parking.id,
        createdAt: vote.createdAt,
      },
    });
  }

  async update(updatedVote: Vote): Promise<void> {
    await this.prismaService.vote.update({
      where: { id: updatedVote.id },
      data: {
        voteType: updatedVote.voteType,
      },
    });
  }

  async cancelByParkingIdAndUserId(
    parkingId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prismaService.vote.delete({
        where: { parkingId_votedById: { parkingId, votedById: userId } },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new ResourceNotFoundException('Vote not found');
      }
      throw e;
    }
  }
}
