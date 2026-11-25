// Regroupe l'API compilée (dist/) en un seul fichier, dist/bundle/main.js, pour l'image de prod.
//
// Pourquoi : au démarrage à froid sur Scaleway, Node mettait ~18 s à charger ~1 900 fichiers
// (dist/ + node_modules) avant la première ligne de Nest. Un seul fichier supprime ces lectures.
//
// On part de la sortie de `nest build` (et non des sources TypeScript) : tsc y a déjà émis les
// métadonnées des décorateurs (injection de Nest) et appliqué le plugin Swagger, ce qu'esbuild
// ne sait pas faire.
import { build } from 'esbuild';

/** Restent hors du bundle, et donc dans le node_modules de l'image. */
const RUNTIME_PACKAGES = [
  'bcrypt', // module natif (.node)
  'swagger-ui-dist', // fichiers statiques servis depuis son dossier
];

/** Chargés par Nest dans un try/catch, seulement s'ils sont installés : on ne s'en sert pas. */
const OPTIONAL_NEST_PACKAGES = [
  '@nestjs/microservices',
  '@nestjs/microservices/*',
  '@nestjs/websockets',
  '@nestjs/websockets/*',
  // Repli de @nestjs/mapped-types quand class-transformer/cjs/storage manque (il est bien là).
  'class-transformer/storage',
];

await build({
  entryPoints: ['dist/main.js'],
  outfile: 'dist/bundle/main.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  // Nest se sert des noms de classes (contexte des logs, jetons d'injection, Swagger).
  keepNames: true,
  // Pas de minification : les piles d'erreur restent lisibles dans les logs, pour un gain négligeable.
  minify: false,
  external: [...RUNTIME_PACKAGES, ...OPTIONAL_NEST_PACKAGES],
  logLevel: 'warning',
  // Le plugin Swagger émet parfois `enum` deux fois dans ses métadonnées (dist/**/*.dto.js) :
  // inoffensif, la dernière valeur gagne, comme sans bundle.
  logOverride: { 'duplicate-object-key': 'silent' },
});
