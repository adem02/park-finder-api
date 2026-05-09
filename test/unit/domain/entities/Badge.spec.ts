import { Badge } from '../../../../src/domain/entities/Badge';
import { BADGE_CATALOG } from '../../../../src/domain/constants/badge.constants';
import {
  BadgeCriteria,
  BadgeName,
  BadgeType,
} from '../../../../src/domain/types/badge.types';
import { InvalidBadgeTresholdException } from '../../../../src/domain/exceptions/InvalidBadgeTreshold.exception';

const makeValidParams = (
  overrides: Partial<Parameters<typeof Badge.create>[0]> = {},
) => ({
  id: 'badge-1',
  name: 'Explorer' as BadgeName,
  description: 'Add 10 parkings to the map',
  iconUrl: 'https://example.com/badge.png',
  criteria: { type: 'parkings_added', threshold: 10 } as BadgeCriteria,
  ...overrides,
});

describe('Badge', () => {
  describe('create', () => {
    it('should create a badge with all provided fields', () => {
      const params = makeValidParams();
      const badge = Badge.create(params);

      expect(badge.id).toBe(params.id);
      expect(badge.name).toBe(params.name);
      expect(badge.description).toBe(params.description);
      expect(badge.iconUrl).toBe(params.iconUrl);
      expect(badge.criteria).toBe(params.criteria);
    });

    it('should accept a threshold of exactly 1', () => {
      const badge = Badge.create(
        makeValidParams({ criteria: { type: 'parkings_added', threshold: 1 } }),
      );
      expect(badge.criteria.threshold).toBe(1);
    });

    it('should accept a large threshold', () => {
      const badge = Badge.create(
        makeValidParams({
          criteria: { type: 'votes_positive_ratio', threshold: 90 },
        }),
      );
      expect(badge.criteria.threshold).toBe(90);
    });

    it('should throw when threshold is 0', () => {
      expect(() =>
        Badge.create(
          makeValidParams({
            criteria: { type: 'parkings_added', threshold: 0 },
          }),
        ),
      ).toThrow(InvalidBadgeTresholdException);
    });

    it('should throw when threshold is negative', () => {
      expect(() =>
        Badge.create(
          makeValidParams({
            criteria: { type: 'parkings_added', threshold: -5 },
          }),
        ),
      ).toThrow(InvalidBadgeTresholdException);
    });
  });

  describe('fromCatalog', () => {
    it('should create a badge from the parkings_added catalog entry', () => {
      const type: BadgeType = 'parkings_added';
      const badge = Badge.fromCatalog(
        type,
        'badge-1',
        'https://example.com/icon.png',
      );
      const entry = BADGE_CATALOG[type];

      expect(badge.id).toBe('badge-1');
      expect(badge.iconUrl).toBe('https://example.com/icon.png');
      expect(badge.name).toBe(entry.name);
      expect(badge.description).toBe(entry.description);
      expect(badge.criteria.type).toBe(entry.criteria);
      expect(badge.criteria.threshold).toBe(entry.threshold);
    });

    it('should create a badge from the votes_positive_ratio catalog entry', () => {
      const type: BadgeType = 'votes_positive_ratio';
      const badge = Badge.fromCatalog(
        type,
        'badge-2',
        'https://example.com/icon2.png',
      );
      const entry = BADGE_CATALOG[type];

      expect(badge.name).toBe(entry.name);
      expect(badge.criteria.type).toBe(entry.criteria);
      expect(badge.criteria.threshold).toBe(entry.threshold);
    });
  });
});
