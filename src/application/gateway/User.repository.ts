import { User } from '../../domain/entities/User';
import { UserStats } from '../../domain/types/user.types';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<void>;
  updateById(id: string, updatedUser: User): Promise<void>;
  deleteById(id: string): Promise<void>;
  findStatsByUserId(userId: string): Promise<UserStats>;
}
