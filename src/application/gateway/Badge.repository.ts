import { Badge } from '../../domain/entities/Badge';

export interface BadgeRepository {
  findAll(): Promise<Badge[]>;
  findByUserId(userId: string): Promise<Badge[]>;
  assignToUser(userId: string, badge: Badge): Promise<void>;
}
