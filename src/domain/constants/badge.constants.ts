import { BadgeType } from '../types/badge.types';

export interface BadgeCatalog {
  name: string;
  description: string;
  criteria: BadgeType;
  threshold: number;
}

export const BADGE_CATALOG = {
  parkings_added: {
    name: 'Explorer',
    description: 'Add 10 parkings to the map',
    criteria: 'parkings_added',
    threshold: 10,
  },
  votes_positive_ratio: {
    name: 'Precise',
    description: 'Receive 90% positive votes on your parkings',
    criteria: 'votes_positive_ratio',
    threshold: 90,
  },
} as const satisfies Record<BadgeType, BadgeCatalog>;
