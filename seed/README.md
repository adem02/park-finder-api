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
