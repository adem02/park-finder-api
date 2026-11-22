import { BADGE_CATALOG } from '../constants/badge.constants';
import { BadgeCriteria, BadgeName, BadgeType } from '../types/badge.types';
import { InvalidBadgeThresholdException } from '../exceptions/InvalidBadgeThreshold.exception';

interface BadgeParams {
  id: string;
  name: BadgeName;
  description: string;
  iconUrl: string;
  criteria: BadgeCriteria;
}

export class Badge {
  private constructor(
    readonly id: string,
    readonly name: BadgeName,
    readonly description: string,
    readonly iconUrl: string,
    readonly criteria: BadgeCriteria,
  ) {}

  static create(params: BadgeParams) {
    if (params.criteria.threshold <= 0) {
      throw new InvalidBadgeThresholdException(
        'Badge criteria threshold must be greater than 0.',
      );
    }

    return new Badge(
      params.id,
      params.name,
      params.description,
      params.iconUrl,
      params.criteria,
    );
  }

  static fromCatalog(type: BadgeType, id: string, iconUrl: string) {
    const badgeInfo = BADGE_CATALOG[type];

    return Badge.create({
      id,
      name: badgeInfo.name,
      description: badgeInfo.description,
      iconUrl,
      criteria: {
        type: badgeInfo.criteria,
        threshold: badgeInfo.threshold,
      },
    });
  }
}
