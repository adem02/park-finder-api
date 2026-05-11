import { UserRepository } from '../../application/gateway/User.repository';
import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/User';
import { UserStats } from '../../domain/types/user.types';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  private readonly users: User[] = [];
  constructor() {}

  findById(id: string): Promise<User | null> {
    const user = this.users.find((user) => user.id === id) ?? null;

    return Promise.resolve(user);
  }
  findByUsername(username: string): Promise<User | null> {
    const user = this.users.find((user) => user.username === username) ?? null;

    return Promise.resolve(user);
  }
  findByEmail(email: string): Promise<User | null> {
    const user = this.users.find((user) => user.email === email) ?? null;

    return Promise.resolve(user);
  }
  create(user: User): Promise<void> {
    this.users.push(user);

    return Promise.resolve();
  }
  updateById(_id: string, _updatedUser: User): Promise<void> {
    throw new Error('Method not implemented.');
  }
  deleteById(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  findStatsByUserId(_userId: string): Promise<UserStats> {
    throw new Error('Method not implemented.');
  }
}
