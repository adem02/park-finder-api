export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 50;

/**
 * Compte système : auteur des parkings importés et héritier des parkings d'un compte supprimé.
 * Sans identifiants (personne ne peut s'y connecter) et sans points.
 */
export const SYSTEM_USER = {
  id: 'system-placegratos',
  username: 'PlaceGratos',
} as const;

/** Pseudo d'un compte supprimé : ce préfixe suivi du début de son id (unique, sans rien d'identifiant). */
export const DELETED_USERNAME_PREFIX = 'compte-supprime-';
