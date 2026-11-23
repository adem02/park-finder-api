# Données de dev (`yarn seed`)

Peuple une base **locale** pour développer la PWA en mode API sur des données réalistes.

- `reims-free-parkings.json` : 91 parkings gratuits et publics de Reims, extraits
  d'OpenStreetMap. © les contributeurs d'OpenStreetMap, données sous licence
  [ODbL](https://opendatacommons.org/licenses/odbl/) (https://www.openstreetmap.org/copyright).
  C'est le même jeu que le mode démo de la PWA, pour que les deux modes affichent les mêmes parkings.
- Contributeurs, signalements, votes et commentaires sont **fictifs**.
- Compte de dev : `dev@parkfinder.local` / `Dev123!` (local uniquement, jamais en prod).

```bash
yarn seed           # ne fait rien si des parkings existent déjà
yarn seed --reset   # vide les tables puis repeuple (refusé si NODE_ENV=production)
```

Les signalements de disponibilité expirent au bout de 15 minutes, comme dans l'app :
relancer `yarn seed --reset` pour en avoir de frais.

## Import en production (`yarn import:parkings`)

Données **réelles uniquement** (pas de communauté fictive) : `production/reims-free-parkings.json`,
31 parkings gratuits et explicitement publics (OSM `access=yes`) de Reims, préparés par `parkings-data/scripts/build_prod_import.py` (dépôt workspace)
à partir de la collecte du 2026-11-22. © les contributeurs d'OpenStreetMap, ODbL ; noms manquants
complétés par la rue la plus proche (géocodage Géoplateforme IGN, Licence Ouverte 2.0).

```bash
yarn import:parkings                       # simulation : bilan exact, rien n'est écrit
yarn import:parkings <fichier> --apply     # écrit (parkings à moins de 50 m d'un existant ignorés)
```

En prod, passer par le workflow GitHub **Import parkings** (lancement manuel, simulation par défaut) :
il utilise les secrets de l'environnement `production`, rien n'est à configurer sur un poste.
Les parkings importés appartiennent au compte système `PlaceGratos` (sans identifiants, sans points).
