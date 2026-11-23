import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, TransactionRollbackError } from 'drizzle-orm';
import { DrizzleService } from '../src/infrastructure/orm/drizzle/Drizzle.service';
import { parkings, users } from '../src/infrastructure/orm/drizzle/schema';
import {
  DUPLICATE_PARKING_RADIUS_METERS,
  PARKING_NAME_MAX_LENGTH,
  PARKING_NAME_MIN_LENGTH,
  PARKING_TOTAL_SPOTS_MAX,
  PARKING_TOTAL_SPOTS_MIN,
} from '../src/domain/constants/parking.constants';

/**
 * Importe des parkings réels, production comprise : aucune donnée fictive, contrairement à `yarn seed`.
 * Le fichier vient de parkings-data/scripts/build_prod_import.py (dépôt workspace).
 *
 * - **Simulation par défaut** : tout est exécuté puis annulé, le bilan est donc exact. `--apply` pour écrire.
 * - **Rejouable** : un parking est ignoré si son id existe déjà ou s'il y a un parking à moins de 50 m
 *   (même règle anti-doublon que l'ajout dans l'app, qui protège aussi les ajouts des utilisateurs).
 * - **Auteur** : le compte système « PlaceGratos », sans identifiants (personne ne peut s'y connecter),
 *   et sans points : il n'apparaît pas au classement.
 *
 * Usage : `yarn import:parkings [fichier] [--apply]`
 */

export const SYSTEM_USER = {
  id: 'system-placegratos',
  username: 'PlaceGratos',
};
const DEFAULT_FILE = join(__dirname, 'production', 'reims-free-parkings.json');

interface ImportedParking {
  id: string;
  name: string;
  totalSpots: number;
  latitude: number;
  longitude: number;
}

interface ImportFile {
  city: string;
  licence: string;
  parkings: ImportedParking[];
}

function assertValid(parking: ImportedParking): void {
  const problems = [
    !/^[\w-]+$/.test(parking.id) && 'id',
    (parking.name.length < PARKING_NAME_MIN_LENGTH ||
      parking.name.length > PARKING_NAME_MAX_LENGTH) &&
      'name',
    (!Number.isInteger(parking.totalSpots) ||
      parking.totalSpots < PARKING_TOTAL_SPOTS_MIN ||
      parking.totalSpots > PARKING_TOTAL_SPOTS_MAX) &&
      'totalSpots',
    Math.abs(parking.latitude) > 90 && 'latitude',
    Math.abs(parking.longitude) > 180 && 'longitude',
  ].filter(Boolean);
  if (problems.length > 0) {
    throw new Error(`Parking ${parking.id} invalide : ${problems.join(', ')}.`);
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const file =
    process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? DEFAULT_FILE;
  const data = JSON.parse(readFileSync(file, 'utf8')) as ImportFile;
  data.parkings.forEach(assertValid);

  const drizzleService = new DrizzleService();
  const inserted: string[] = [];
  const skipped: string[] = [];

  try {
    await drizzleService.db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ ...SYSTEM_USER, email: null })
        .onConflictDoNothing({ target: users.id });

      for (const parking of data.parkings) {
        const point = sql`ST_SetSRID(ST_MakePoint(${parking.longitude}, ${parking.latitude}), 4326)::geography`;
        const { rows } = await tx.execute<{ taken: boolean }>(sql`
          SELECT EXISTS (
            SELECT 1 FROM parkings
            WHERE id = ${parking.id}
               OR ST_DWithin(location, ${point}, ${DUPLICATE_PARKING_RADIUS_METERS})
          ) AS taken
        `);
        if (rows[0]?.taken) {
          skipped.push(parking.name);
          continue;
        }

        await tx.insert(parkings).values({
          ...parking,
          photos: [],
          addedById: SYSTEM_USER.id,
          createdAt: new Date(),
        });
        await tx.execute(
          sql`UPDATE parkings SET location = ${point} WHERE id = ${parking.id}`,
        );
        inserted.push(parking.name);
      }

      if (!apply) tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  } finally {
    await drizzleService.onModuleDestroy();
  }

  const mode = apply ? 'Import' : 'Simulation (rien n’est écrit)';
  console.log(
    `${mode} : ${data.city}, ${data.parkings.length} parkings dans le fichier.`,
  );
  console.log(`- ${inserted.length} ${apply ? 'ajoutés' : 'seraient ajoutés'}`);
  console.log(
    `- ${skipped.length} ignorés (déjà présents ou parking à moins de ${DUPLICATE_PARKING_RADIUS_METERS} m)`,
  );
  if (skipped.length > 0) console.log(`  ${skipped.join(', ')}`);
  if (!apply) console.log('Relancer avec --apply pour écrire.');
}

main().catch((error: unknown) => {
  console.error('Import failed:', error);
  process.exit(1);
});
