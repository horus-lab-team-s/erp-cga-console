/**
 * La matrice des rôles, telle que `GET /transverse/matrice-des-roles` la rend (18 octobre 2026).
 * ⚠️ Aucun import : les composants navigateur en tirent leurs types.
 */

export type DroitDeLaGrille = {
  code: string;
  libelle: string;
  /** Au super administrateur seul : la case ne se coche sur aucun autre rôle. */
  reserve_au_super_admin: boolean;
  /** Geste du client sur son dossier : jamais pour un rôle interne. */
  geste_du_client: boolean;
  /** Peut aller à un rôle externe (adhérent, client, inspecteur). */
  externe_possible: boolean;
};

export type FamilleDeDroits = { famille: string; droits: DroitDeLaGrille[] };

export type RoleDeLaGrille = {
  code: string;
  libelle: string;
  permissions: string[];
  systeme: boolean;
  externe: boolean;
  portee_obligatoire: boolean;
  /** Ses droits diffèrent de la matrice livrée, ou c'est un rôle du cabinet. */
  regle: boolean;
  reglee_par: string | null;
  reglee_le: string | null;
};

export type MatriceDesRoles = { familles: FamilleDeDroits[]; roles: RoleDeLaGrille[]; reglable: boolean };

/** La case est-elle permise à ce rôle ? Le miroir des bornes du serveur, pour griser. */
export function casePermise(role: RoleDeLaGrille, droit: DroitDeLaGrille): boolean {
  if (droit.reserve_au_super_admin) return false; // ni cochable ni décochable : fixée
  if (role.externe) return droit.externe_possible;
  return !droit.geste_du_client;
}
