import { Badge as DomainBadge } from '../../../domain/entities/Badge';
import { BadgeName, BadgeType } from '../../../domain/types/badge.types';
import { Badge as ModelBadge } from '../prisma/generated/client';

export class BadgeMapper {
  static toDomain(model: ModelBadge): DomainBadge {
    return DomainBadge.create({
      id: model.id,
      name: model.name as BadgeName,
      description: model.description,
      iconUrl: model.iconUrl,
      criteria: {
        type: model.criteriaType as BadgeType,
        threshold: model.criteriaThreshold,
      },
    });
  }
}
