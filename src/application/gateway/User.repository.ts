import { User } from '../../domain/entities/User';
import { UserStats } from '../../domain/types/user.types';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<void>;
  updateById(id: string, updatedUser: User): Promise<void>;
  updatePointsById(id: string, points: number): Promise<void>;
  deleteById(id: string): Promise<void>;
  /**
   * Account deletion, in one transaction: parkings go to `parkingsHeir`, comments, badges,
   * leaderboard entries, credentials and sessions are deleted, and the user row is stripped of
   * anything identifying. Votes and availability reports stay, now anonymous, so other users'
   * parking scores do not change.
   */
  anonymize(
    id: string,
    parkingsHeir: { id: string; username: string },
  ): Promise<void>;
  findStatsByUserId(userId: string): Promise<UserStats>;
}
