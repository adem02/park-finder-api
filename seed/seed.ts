import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../src/infrastructure/orm/drizzle/Drizzle.service';
import {
  availabilityReports,
  comments,
  monthlyLeaderboard,
  parkings,
  userCredentials,
  users,
  votes,
} from '../src/infrastructure/orm/drizzle/schema';
import { AVAILABILITY_EXPIRY_MINUTES } from '../src/domain/constants/availability.constants';
import { POINTS_PER_ACTION } from '../src/domain/constants/points.constants';

/**
 * Données de dev : les 91 parkings gratuits de Reims (OSM, ODbL) et une communauté fictive.
 * Usage : `yarn seed` (ne fait rien si la base contient déjà des parkings) ou `yarn seed --reset`.
 */

interface ParkingSeed {
  id: string;
  name: string;
  totalSpots: number;
  latitude: number;
  longitude: number;
}

const DEV_ACCOUNT = {
  email: 'dev@parkfinder.local',
  password: 'Dev123!',
  username: 'dev',
};
const CONTRIBUTORS = ['camille_r', 'theo51', 'ines.m', 'lucas_reims'];
/** Assez de votants pour qu'un parking dépasse le seuil « vérifié » (score net > 10). */
const VOTERS = Array.from(
  { length: 14 },
  (_, index) => `voisin${String(index + 1).padStart(2, '0')}`,
);
const COMMENTS = [
  'Souvent des places le matin avant 9 h.',
  'Accès facile, bien éclairé le soir.',
  'Plein le samedi après-midi.',
  'Attention, une partie est réservée aux riverains.',
  'Pratique pour aller au centre à pied.',
];

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const pick = <T>(items: readonly T[], index: number): T =>
  items[index % items.length];

function assertSafeToReset(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset data with NODE_ENV=production.');
  }
}

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const drizzleService = new DrizzleService();
  const { db } = drizzleService;

  try {
    const [{ value: existing }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(parkings);

    if (existing > 0 && !reset) {
      console.log(
        `Base déjà peuplée (${existing} parkings) : rien à faire. « yarn seed --reset » pour repartir de zéro.`,
      );
      return;
    }

    if (reset) {
      assertSafeToReset();
      await db.execute(
        sql.raw(
          'TRUNCATE TABLE "comments", "votes", "availability_reports", "monthly_leaderboard", "user_badges", "refresh_tokens", "parkings", "user_credentials", "users" RESTART IDENTITY CASCADE',
        ),
      );
    }

    const now = new Date();
    const seeds = JSON.parse(
      readFileSync(join(__dirname, 'reims-free-parkings.json'), 'utf8'),
    ) as ParkingSeed[];

    // --- Utilisateurs ---------------------------------------------------
    const devId = randomUUID();
    const contributorIds = CONTRIBUTORS.map(() => randomUUID());
    const voterIds = VOTERS.map(() => randomUUID());

    await db.insert(users).values([
      {
        id: devId,
        username: DEV_ACCOUNT.username,
        email: DEV_ACCOUNT.email,
        points: 0,
      },
      ...CONTRIBUTORS.map((username, index) => ({
        id: contributorIds[index],
        username,
        email: `${username.replace('.', '-')}@parkfinder.local`,
        points: 0,
      })),
      ...VOTERS.map((username, index) => ({
        id: voterIds[index],
        username,
        email: `${username}@parkfinder.local`,
        points: 0,
      })),
    ]);
    // Seul le compte de dev peut se connecter.
    await db.insert(userCredentials).values({
      id: randomUUID(),
      userId: devId,
      provider: 'local',
      passwordHash: await bcrypt.hash(DEV_ACCOUNT.password, 10),
    });

    // --- Parkings ---------------------------------------------------------
    const points = new Map<string, number>();
    const award = (userId: string, amount: number) =>
      points.set(userId, (points.get(userId) ?? 0) + amount);

    await db.insert(parkings).values(
      seeds.map((seed, index) => {
        const addedById = pick(contributorIds, index);
        award(addedById, POINTS_PER_ACTION.PARKING_ADDED);
        return {
          id: seed.id,
          name: seed.name,
          totalSpots: seed.totalSpots,
          photos: [],
          latitude: seed.latitude,
          longitude: seed.longitude,
          addedById,
          // Dates d'ajout étalées : le tri « ajoutés récemment » a du sens.
          createdAt: new Date(now.getTime() - ((index * 13) % 120) * DAY_MS),
        };
      }),
    );
    await db.execute(
      sql`UPDATE parkings SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`,
    );

    // --- Signalements : récent, ancien, complet, ou aucun -------------------
    const reports = seeds.flatMap((seed, index) => {
      const minutesAgo = [3, 12, 6, null, null][index % 5];
      if (minutesAgo === null) return [];
      const reportedAt = new Date(now.getTime() - minutesAgo * MINUTE_MS);
      const spots =
        index % 5 === 2
          ? 0
          : Math.max(
              1,
              Math.round(seed.totalSpots * (index % 3 === 0 ? 0.6 : 0.2)),
            );
      const reportedById = pick(contributorIds, index + 1);
      award(reportedById, POINTS_PER_ACTION.AVAILABILITY_REPORTED);
      return [
        {
          id: randomUUID(),
          parkingId: seed.id,
          reportedById,
          availableSpots: Math.min(spots, seed.totalSpots),
          reportedAt,
          expiresAt: new Date(
            reportedAt.getTime() + AVAILABILITY_EXPIRY_MINUTES * MINUTE_MS,
          ),
        },
      ];
    });
    if (reports.length > 0)
      await db.insert(availabilityReports).values(reports);

    // --- Votes : un parking sur trois est « vérifié » (score net > 10) -------
    const voteRows = seeds.flatMap((seed, index) => {
      const upvotes = index % 3 === 0 ? 11 + (index % 4) : index % 4;
      const downvotes = index % 3 === 0 ? 0 : index % 2;
      return [
        ...voterIds
          .slice(0, upvotes)
          .map((votedById) => ({ votedById, voteType: 'UPVOTE' as const })),
        ...voterIds.slice(upvotes, upvotes + downvotes).map((votedById) => ({
          votedById,
          voteType: 'DOWNVOTE' as const,
        })),
      ].map((vote) => {
        award(vote.votedById, POINTS_PER_ACTION.VOTE_CAST);
        return { id: randomUUID(), parkingId: seed.id, ...vote };
      });
    });
    if (voteRows.length > 0) await db.insert(votes).values(voteRows);

    // --- Commentaires : un parking sur deux --------------------------------
    const commentRows = seeds.flatMap((seed, index) =>
      index % 2 === 1
        ? []
        : Array.from({ length: (index % 4) + 1 }, (_, position) => ({
            id: randomUUID(),
            parkingId: seed.id,
            authorId: pick(contributorIds, index + position + 1),
            content: pick(COMMENTS, index + position),
            createdAt: new Date(
              now.getTime() -
                (position + 1) * ((index % 5) + 1) * 60 * MINUTE_MS,
            ),
          })),
    );
    if (commentRows.length > 0) await db.insert(comments).values(commentRows);

    // --- Points et classement du mois -------------------------------------
    const month = now.toISOString().slice(0, 7);
    const ranking = [...points.entries()].sort((a, b) => b[1] - a[1]);
    for (const [userId, total] of ranking) {
      await db
        .update(users)
        .set({ points: total })
        .where(sql`${users.id} = ${userId}`);
    }
    await db.insert(monthlyLeaderboard).values(
      ranking.map(([userId, monthlyPoints], index) => ({
        id: randomUUID(),
        userId,
        month,
        monthlyPoints,
        rank: index + 1,
      })),
    );

    console.log(
      `Seed terminé : ${seeds.length} parkings, ${reports.length} signalements, ${voteRows.length} votes, ${commentRows.length} commentaires.`,
    );
    console.log(
      `Compte de dev : ${DEV_ACCOUNT.email} / ${DEV_ACCOUNT.password}`,
    );
  } finally {
    await drizzleService.onModuleDestroy();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
