/**
 * La file des dépôts en attente de réseau, sur le téléphone de l'adhérent (pas 96).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UNE FILE, ET POURQUOI SUR LE TÉLÉPHONE
 *
 * L'inventaire décrit un adhérent qui photographie sa facture là où il la reçoit : au
 * marché, sur un chantier, dans un taxi. Le réseau y manque souvent. Sans file, la photo
 * prise est perdue au premier « échec d'envoi », et l'adhérent ne la reprendra pas.
 *
 * Le dépôt est donc gardé dans le navigateur (IndexedDB : le fichier entier, pas un
 * lien), avec **le jour de la capture**, et part au retour du réseau.
 *
 * ⚠️ POURQUOI LE REJEU EST SANS DANGER
 *
 * Une file rejoue par construction : une réponse perdue après un envoi réussi fera
 * renvoyer le même dépôt. Le backend reconnaît la pièce (son identifiant dérive du
 * fichier et du dossier) et la rend **inchangée**. Avant le pas 96, ce rejeu remettait à
 * zéro une pièce déjà lue par le cabinet : c'est ce défaut, corrigé au domaine, qui
 * rendait la file dangereuse.
 *
 * ⚠️ CE QUE LA FILE NE FAIT PAS
 *
 * Elle ne rouvre pas la page sans réseau : il faut que l'espace adhérent ait été ouvert
 * au moins une fois, et soit resté ouvert ou revienne avec le réseau. Un service worker
 * qui mettrait l'espace en cache engagerait des données de dossier dans le cache du
 * téléphone ; ce choix n'est pas pris ici.
 *
 * Aucune donnée ne quitte le téléphone autrement que par le dépôt lui-même. Toute
 * lecture est protégée : un navigateur privé qui refuse IndexedDB rend une file vide, et
 * le dépôt direct reste possible.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type DepotEnAttente = {
  id: string;
  dossier: string;
  fichier: Blob;
  nomFichier: string;
  typeMime: string;
  /** Les champs facultatifs du formulaire, tels qu'ils ont été saisis. */
  champs: Record<string, string>;
  /** AAAA-MM-JJ : le jour de la capture, envoyé comme date de dépôt. */
  captureLe: string;
  essais: number;
  /** La phrase du cabinet si le dépôt a été refusé ; `null` s'il attend seulement le réseau. */
  refus: string | null;
};

const BASE = "cga-depots-hors-ligne";
const MAGASIN = "depots";

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(BASE, 1);
    requete.onupgradeneeded = () => requete.result.createObjectStore(MAGASIN, { keyPath: "id" });
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

async function operer<T>(mode: IDBTransactionMode, geste: (magasin: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const base = await ouvrir();
  return new Promise((resoudre, rejeter) => {
    const requete = geste(base.transaction(MAGASIN, mode).objectStore(MAGASIN));
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

export async function listerLaFile(): Promise<DepotEnAttente[]> {
  try {
    const tous = await operer<DepotEnAttente[]>("readonly", (m) => m.getAll() as IDBRequest<DepotEnAttente[]>);
    return tous.sort((a, b) => a.captureLe.localeCompare(b.captureLe) || a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

export async function mettreEnFile(depot: Omit<DepotEnAttente, "id" | "essais" | "refus">): Promise<boolean> {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await operer("readwrite", (m) => m.put({ ...depot, id, essais: 0, refus: null }));
    return true;
  } catch {
    return false;
  }
}

export async function mettreAJour(depot: DepotEnAttente): Promise<void> {
  try {
    await operer("readwrite", (m) => m.put(depot));
  } catch {
    // La file reste telle quelle : le prochain rejeu retentera.
  }
}

export async function retirerDeLaFile(id: string): Promise<void> {
  try {
    await operer("readwrite", (m) => m.delete(id));
  } catch {
    // Sans IndexedDB, il n'y a rien à retirer.
  }
}

/** Le jour local du téléphone, AAAA-MM-JJ. */
export function jourLocal(instant = new Date()): string {
  const decale = new Date(instant.getTime() - instant.getTimezoneOffset() * 60000);
  return decale.toISOString().slice(0, 10);
}
