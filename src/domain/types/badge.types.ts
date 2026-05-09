import { BADGE_CATALOG } from '../constants/badge.constants';

export type BadgeType = 'parkings_added' | 'votes_positive_ratio';

export type BadgeName = (typeof BADGE_CATALOG)[BadgeType]['name'];

export interface BadgeCriteria {
  type: BadgeType;
  threshold: number;
}
