import { Badge as DomainBadge } from '../../../domain/entities/Badge';
import { BadgeName, BadgeType } from '../../../domain/types/badge.types';

interface BadgeModel {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  criteriaType: string;
  criteriaThreshold: number;
}

export class BadgeMapper {
  static toDomain(model: BadgeModel): DomainBadge {
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
