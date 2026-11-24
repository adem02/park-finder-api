import {
  pgTable,
  integer,
  text,
  timestamp,
  pgEnum,
  doublePrecision,
  unique,
  index,
  boolean,
  varchar,
  customType,
} from 'drizzle-orm/pg-core';

export const providerEnum = pgEnum('Provider', ['local', 'google', 'apple']);
export const voteType = pgEnum('VoteType', ['UPVOTE', 'DOWNVOTE']);
export const refreshTokenRevocation = pgEnum('RefreshTokenRevocation', [
  'rotated',
  'logout',
  'reuse',
]);
export const geoPoint = customType<{ data: string }>({
  dataType() {
    return 'geography(Point, 4326)';
  },
});

export const userCredentials = pgTable(
  'user_credentials',
  {
    id: text('id').notNull().primaryKey(),
    userId: text('userId')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    providerId: text('providerId'),
    passwordHash: text('passwordHash'),
    firstName: text('firstName'),
    lastName: text('lastName'),
    photoUrl: text('photoUrl'),
  },
  (table) => [
    unique('user_credentials_provider_providerId_key').on(
      table.provider,
      table.providerId,
    ),
  ],
);

export const users = pgTable('users', {
  id: text('id').notNull().primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  photoUrl: text('photoUrl'),
  points: integer('points').notNull().default(0),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

export const parkings = pgTable(
  'parkings',
  {
    id: text('id').notNull().primaryKey(),
    name: text('name').notNull(),
    totalSpots: integer('totalSpots').notNull(),
    photos: text('photos').array(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    location: geoPoint('location'),
    addedById: text('addedById')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [index('parkings_location_idx').using('gist', table.location)],
);

/**
 * Photo ledger: who posted which photo. `parkings.photos` stays the display list read everywhere;
 * both are always written together, in one transaction (DrizzleParkingRepository.create and
 * DrizzleParkingPhotoRepository).
 */
export const parkingPhotos = pgTable(
  'parking_photos',
  {
    id: text('id').notNull().primaryKey(),
    parkingId: text('parkingId')
      .notNull()
      .references(() => parkings.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    url: text('url').notNull(),
    /** Points given for this photo (0 for photos posted with the parking), taken back on removal. */
    awardedPoints: integer('awardedPoints').notNull().default(0),
    addedById: text('addedById')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('parking_photos_parkingId_idx').on(table.parkingId),
    unique('parking_photos_parkingId_url_key').on(table.parkingId, table.url),
  ],
);

export const availabilityReports = pgTable(
  'availability_reports',
  {
    id: text('id').notNull().primaryKey(),
    parkingId: text('parkingId')
      .notNull()
      .references(() => parkings.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    reportedById: text('reportedById')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    availableSpots: integer('availableSpots').notNull(),
    reportedAt: timestamp('reportedAt', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    expired: boolean('expired').notNull().default(false),
  },
  (table) => [
    index('availability_reports_parkingId_reportedAt_idx').on(
      table.parkingId,
      table.reportedAt.desc(),
    ),
    index('availability_reports_expiresAt_idx').on(table.expiresAt),
  ],
);

export const votes = pgTable(
  'votes',
  {
    id: text('id').notNull().primaryKey(),
    parkingId: text('parkingId')
      .notNull()
      .references(() => parkings.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    votedById: text('votedById')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    voteType: voteType('voteType').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    unique('votes_parkingId_votedById_key').on(
      table.parkingId,
      table.votedById,
    ),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: text('id').notNull().primaryKey(),
    content: varchar('content', { length: 500 }).notNull(),
    parkingId: text('parkingId')
      .notNull()
      .references(() => parkings.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    authorId: text('authorId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    index('comments_parkingId_createdAt_idx').on(
      table.parkingId,
      table.createdAt.desc(),
    ),
  ],
);

export const badges = pgTable('badges', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  iconUrl: text('iconUrl').notNull(),
  criteriaType: text('criteriaType').notNull(),
  criteriaThreshold: integer('criteriaThreshold').notNull(),
});

export const userBadges = pgTable(
  'user_badges',
  {
    id: text('id').notNull().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    badgeId: text('badgeId')
      .notNull()
      .references(() => badges.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    earnedAt: timestamp('earnedAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('user_badges_userId_badgeId_key').on(table.userId, table.badgeId),
  ],
);

export const monthlyLeaderboard = pgTable(
  'monthly_leaderboard',
  {
    id: text('id').notNull().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    month: text('month').notNull(),
    monthlyPoints: integer('monthlyPoints').notNull().default(0),
    rank: integer('rank').notNull(),
  },
  (table) => [
    unique('monthly_leaderboard_userId_month_key').on(
      table.userId,
      table.month,
    ),
    index('monthly_leaderboard_month_monthlyPoints_idx').on(
      table.month,
      table.monthlyPoints.desc(),
    ),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').notNull().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    familyId: text('familyId').notNull(),
    tokenHash: text('tokenHash').notNull().unique(),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revokedAt', { withTimezone: true }),
    revokedReason: refreshTokenRevocation('revokedReason'),
  },
  (table) => [
    index('refresh_tokens_userId_idx').on(table.userId),
    index('refresh_tokens_familyId_idx').on(table.familyId),
  ],
);
