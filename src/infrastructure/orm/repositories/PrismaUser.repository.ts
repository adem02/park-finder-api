import { UserRepository } from '../../../application/gateway/User.repository';
import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/User';
import { UserStats } from '../../../domain/types/user.types';
import { PrismaService } from '../prisma/Prisma.service';
import { UserMapper } from '../mapper/User.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return UserMapper.toDomain(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    return UserMapper.toDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return UserMapper.toDomain(user);
  }

  async create(user: User): Promise<void> {
    await this.prismaService.user.create({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        photoUrl: user.photoUrl,
        points: user.pointsBalance.points,
        createdAt: user.createdAt,
      },
    });
  }

  updateById(_id: string, _updatedUser: User): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async deleteById(id: string): Promise<void> {
    await this.prismaService.user.delete({
      where: { id },
    });
  }

  findStatsByUserId(_userId: string): Promise<UserStats> {
    throw new Error('Method not implemented.');
  }
}
