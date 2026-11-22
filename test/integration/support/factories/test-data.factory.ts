import { DrizzleService } from '../../../../src/infrastructure/orm/drizzle/Drizzle.service';
import { AvailabilityReportBuilder } from '../builders/availability-report.builder';
import { BadgeBuilder } from '../builders/badge.builder';
import { CommentBuilder } from '../builders/comment.builder';
import { MonthlyLeaderboardBuilder } from '../builders/monthly-leaderboard.builder';
import { ParkingBuilder } from '../builders/parking.builder';
import { UserBadgeBuilder } from '../builders/user-badge.builder';
import { UserCredentialsBuilder } from '../builders/user-credentials.builder';
import { UserBuilder } from '../builders/user.builder';
import { VoteBuilder } from '../builders/vote.builder';

/**
 * Single entry point to create test data for integration tests.
 *
 * Combines the Factory pattern (one place that knows how to wire every
 * builder to the test database) with the Builder pattern (fluent, per-entity
 * overrides on top of sensible defaults):
 *
 *   const user = await factory.user().withUsername('alice').create();
 *   const parking = await factory.parking().addedBy(user.id).create();
 *
 * Every builder can also be used without any dependency: calling `.create()`
 * on a Parking/Vote/Comment/... builder auto-creates its required
 * relations (e.g. a default User) so tests only set up what they actually
 * care about for the scenario under test.
 */
export class TestDataFactory {
  constructor(private readonly drizzleService: DrizzleService) {}

  user(): UserBuilder {
    return new UserBuilder(this.drizzleService);
  }

  credentials(): UserCredentialsBuilder {
    return new UserCredentialsBuilder(this.drizzleService);
  }

  parking(): ParkingBuilder {
    return new ParkingBuilder(this.drizzleService);
  }

  vote(): VoteBuilder {
    return new VoteBuilder(this.drizzleService);
  }

  comment(): CommentBuilder {
    return new CommentBuilder(this.drizzleService);
  }

  availabilityReport(): AvailabilityReportBuilder {
    return new AvailabilityReportBuilder(this.drizzleService);
  }

  badge(): BadgeBuilder {
    return new BadgeBuilder(this.drizzleService);
  }

  userBadge(): UserBadgeBuilder {
    return new UserBadgeBuilder(this.drizzleService);
  }

  monthlyLeaderboard(): MonthlyLeaderboardBuilder {
    return new MonthlyLeaderboardBuilder(this.drizzleService);
  }
}
