import { randomUUID } from 'node:crypto';
import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { badges } from '../../../../src/infrastructure/orm/drizzle/schema';

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  criteriaType: string;
  criteriaThreshold: number;
}

/**
 * Builder for the `badges` table.
 */
export class BadgeBuilder {
  private row: BadgeRow;

  constructor(private readonly drizzleService: DrizzleService) {
    const suffix = randomUUID().slice(0, 8);
    this.row = {
      id: randomUUID(),
      name: `badge-${suffix}`,
      description: 'Test badge',
      iconUrl: 'https://example.com/badge.png',
      criteriaType: 'parkings_added',
      criteriaThreshold: 10,
    };
  }

  withName(name: string): this {
    this.row.name = name;
    return this;
  }

  withCriteria(criteriaType: string, criteriaThreshold: number): this {
    this.row.criteriaType = criteriaType;
    this.row.criteriaThreshold = criteriaThreshold;
    return this;
  }

  build(): BadgeRow {
    return { ...this.row };
  }

  async create(): Promise<BadgeRow> {
    await this.drizzleService.db.insert(badges).values(this.row);
    return this.build();
  }
}
