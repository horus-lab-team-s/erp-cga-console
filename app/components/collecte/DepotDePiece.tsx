"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { deposerUnePiece } from "@/app/lib/actions-collecte";
import {
  jourLocal,
  listerLaFile,
  mettreAJour,
  mettreEnFile,
  retirerDeLaFile,
  type DepotEnAttente,
} from "@/app/lib/file-hors-ligne";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * E07 · Déposer un justificatif, et E08 · la file hors ligne, depuis l'espace adhérent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MOBILE D'ABORD, ET UN SEUL CHAMP OBLIGATOIRE (pas 81)
 *
 * L'inventaire décrit un adhérent qui photographie sa facture au téléphone. Le seul
 * champ exigé est donc le document. Le type, la référence, la date, le montant et le
 * fournisseur sont facultatifs et repliés : le backend le dit lui-même, « exiger le
 * montant d'une facture pour l'accepter ferait renoncer la moitié des adhérents ».
 * C'est le cabinet qui lit la pièce.
 *
 * ⚠️ PAS 96 : PHOTOGRAPHIER, ET NE RIEN PERDRE SANS RÉSEAU
 *
 * - **« Prendre une photo »** ouvre directement l'appareil photo (`capture`), sur un
 *   champ distinct : le champ principal garde la galerie et le PDF. Forcer `capture` sur
 *   le champ unique interdisait d'envoyer un PDF reçu par courriel.
 * - **Sans réseau, le dépôt est gardé sur le téléphone**, avec le jour de la capture, et
 *   part au retour du réseau, tout seul ou d'un geste. Voir `lib/file-hors-ligne.ts`.
 *   Un refus du cabinet (fichier illisible, trop lourd) reste affiché dans la file, avec
 *   sa phrase, jusqu'à ce que l'adhérent le retire : un dépôt ne disparaît pas en silence.
 *
 * Le formulaire se vide après un envoi ou une mise en file : un second dépôt ne doit pas
 * renvoyer le même fichier par inadvertance.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CHAMPS_FACULTATIFS = ["type", "emetteur", "reference_document", "date_document", "montant_ttc", "commentaire"];

/** Un dépôt de la file, remis en formulaire pour l'action serveur. */
function enFormulaire(depot: DepotEnAttente): FormData {
  const donnees = new FormData();
  donnees.set("dossier", depot.dossier);
  donnees.set("fichier", new File([depot.fichier], depot.nomFichier, { type: depot.typeMime }));
  donnees.set("capture_le", depot.captureLe);
  for (const [cle, valeur] of Object.entries(depot.champs)) donnees.set(cle, valeur);
  return donnees;
}

export function DepotDePiece({ dossier }: { dossier: string }) {
  const formulaire = useRef<HTMLFormElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);
  const [etat, setEtat] = useState<EtatActe>(ETAT_ACTE_INITIAL);
  const [enCours, demarrer] = useTransition();
  const [file, setFile] = useState<DepotEnAttente[]>([]);
  const [enSynchronisation, setEnSynchronisation] = useState(false);

  const relireLaFile = useCallback(async () => {
    setFile((await listerLaFile()).filter((d) => d.dossier === dossier));
  }, [dossier]);

  /**
   * Rejoue la file, un dépôt après l'autre. Un échec réseau arrête le rejeu (inutile
   * d'essayer les suivants) ; un refus du cabinet est noté sur le dépôt, et l'on passe
   * au suivant.
   */
  const synchroniser = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setEnSynchronisation(true);
    try {
      for (const depot of (await listerLaFile()).filter((d) => d.dossier === dossier && d.refus === null)) {
        let resultat: EtatActe;
        try {
          resultat = await deposerUnePiece(ETAT_ACTE_INITIAL, enFormulaire(depot));
        } catch {
          await mettreAJour({ ...depot, essais: depot.essais + 1 });
          break;
        }
        if (resultat.fait) await retirerDeLaFile(depot.id);
        else await mettreAJour({ ...depot, essais: depot.essais + 1, refus: resultat.echec });
      }
    } finally {
      setEnSynchronisation(false);
      await relireLaFile();
    }
  }, [dossier, relireLaFile]);

  useEffect(() => {
    // Au chargement (la page revient souvent avec le réseau) et à chaque retour du réseau.
    // Différé d'un tour : la file se lit après le premier rendu, jamais pendant (IndexedDB
    // est asynchrone, et l'état se met à jour quand elle répond).
    const minuterie = window.setTimeout(() => void relireLaFile().then(synchroniser), 0);
    const auRetour = () => void synchroniser();
    window.addEventListener("online", auRetour);
    return () => {
      window.clearTimeout(minuterie);
      window.removeEventListener("online", auRetour);
    };
  }, [relireLaFile, synchroniser]);

  async function garderSurLeTelephone(donnees: FormData, fichier: File) {
    const champs: Record<string, string> = {};
    for (const cle of CHAMPS_FACULTATIFS) {
      const valeur = String(donnees.get(cle) ?? "").trim();
      if (valeur) champs[cle] = valeur;
    }
    const garde = await mettreEnFile({
      dossier,
      fichier,
      nomFichier: fichier.name || `photo-${jourLocal()}.jpg`,
      typeMime: fichier.type || "image/jpeg",
      champs,
      captureLe: jourLocal(),
    });
    setEtat(
      garde
        ? { echec: null, fait: "Pas de réseau : la pièce est gardée sur ce téléphone et partira dès le retour du réseau." }
        : { echec: "Pas de réseau, et ce navigateur ne permet pas de garder la pièce. Réessayez avec du réseau.", fait: null },
    );
    if (garde) formulaire.current?.reset();
    await relireLaFile();
  }

  function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    const fichier = donnees.get("fichier");
    if (!(fichier instanceof File) || fichier.size === 0) {
      setEtat({ echec: "Choisissez le document ou prenez une photo.", fait: null });
      return;
    }
    demarrer(async () => {
      if (!navigator.onLine) {
        await garderSurLeTelephone(donnees, fichier);
        return;
      }
      try {
        const resultat = await deposerUnePiece(ETAT_ACTE_INITIAL, donnees);
        setEtat(resultat);
        if (resultat.fait) formulaire.current?.reset();
      } catch {
        // L'action serveur n'a pas pu être jointe : c'est le réseau, pas un refus.
        await garderSurLeTelephone(donnees, fichier);
      }
    });
  }

  /** La photo prise remplace le document choisi : un seul fichier par dépôt. */
  function photoPrise(evenement: React.ChangeEvent<HTMLInputElement>) {
    const photo = evenement.target.files?.[0];
    if (!photo || !champFichier.current) return;
    const transfert = new DataTransfer();
    transfert.items.add(photo);
    champFichier.current.files = transfert.files;
  }

  return (
    <>
      <form ref={formulaire} onSubmit={envoyer} className="adherent__depot">
        <input type="hidden" name="dossier" value={dossier} />
        <label className="adherent__depot-fichier">
          <span>Le document</span>
          <input ref={champFichier} type="file" name="fichier" accept="image/jpeg,image/png,image/tiff,application/pdf" />
          <small>Photo ou PDF, 20 Mo au plus.</small>
        </label>
        <label className="adherent__depot-photo">
          <span>ou</span>
          <input type="file" accept="image/*" capture="environment" onChange={photoPrise} aria-label="Prendre une photo du document" />
          <small>Prendre une photo avec le téléphone.</small>
        </label>

        <details className="adherent__depot-details">
          <summary>Préciser (facultatif)</summary>
          <label>
            <span>Nature</span>
            <select name="type" defaultValue="INDETERMINE">
              <option value="INDETERMINE">Je ne sais pas</option>
              <option value="FACTURE_ACHAT">Facture d&rsquo;achat</option>
              <option value="FACTURE_VENTE">Facture de vente</option>
              <option value="RECU">Reçu</option>
              <option value="RELEVE_BANCAIRE">Relevé bancaire</option>
              <option value="RELEVE_MOBILE_MONEY">Relevé Mobile Money</option>
              <option value="BULLETIN_PAIE">Bulletin de paie</option>
              <option value="QUITTANCE_IMPOT">Quittance d&rsquo;impôt</option>
              <option value="CONTRAT">Contrat</option>
              <option value="AUTRE">Autre</option>
            </select>
          </label>
          <label>
            <span>Fournisseur ou émetteur</span>
            <input name="emetteur" autoComplete="off" />
          </label>
          <label>
            <span>Numéro du document</span>
            <input name="reference_document" autoComplete="off" />
          </label>
          <label>
            <span>Date du document</span>
            <input type="date" name="date_document" />
          </label>
          <label>
            <span>Montant TTC</span>
            <input name="montant_ttc" inputMode="decimal" placeholder="125000" />
          </label>
          <label>
            <span>Un mot pour le cabinet</span>
            <textarea name="commentaire" rows={2} />
          </label>
        </details>

        <button type="submit" className="adherent__depot-envoyer" disabled={enCours}>
          {enCours ? "Envoi en cours…" : "Envoyer au cabinet"}
        </button>
        {etat.echec && (
          <p role="alert" className="adherent__depot-retour" data-ton="echec">
            {etat.echec}
          </p>
        )}
        {etat.fait && (
          <p role="status" className="adherent__depot-retour" data-ton="fait">
            {etat.fait}
          </p>
        )}
      </form>

      {file.length > 0 && (
        <FileDeSynchronisation
          file={file}
          enSynchronisation={enSynchronisation}
          synchroniser={() => void synchroniser()}
          retirer={async (id) => {
            await retirerDeLaFile(id);
            await relireLaFile();
          }}
          reessayer={async (depot) => {
            await mettreAJour({ ...depot, refus: null });
            await synchroniser();
          }}
        />
      )}
    </>
  );
}

/**
 * E08 · Ce qui attend sur le téléphone.
 *
 * Un dépôt en attente de réseau et un dépôt refusé ne se ressemblent pas : le premier
 * partira seul, le second demande un geste (retirer, ou réessayer après correction côté
 * cabinet). Le libellé le dit, la couleur ne le dit pas seule.
 */
function FileDeSynchronisation({
  file,
  enSynchronisation,
  synchroniser,
  retirer,
  reessayer,
}: {
  file: DepotEnAttente[];
  enSynchronisation: boolean;
  synchroniser: () => void;
  retirer: (id: string) => Promise<void>;
  reessayer: (depot: DepotEnAttente) => Promise<void>;
}) {
  const enAttente = file.filter((d) => d.refus === null).length;
  return (
    <section className="adherent__file" aria-label="Pièces gardées sur ce téléphone">
      <h3 className="adherent__titre">
        {file.length} pièce{file.length > 1 ? "s" : ""} gardée{file.length > 1 ? "s" : ""} sur ce téléphone
      </h3>
      <ul className="adherent__liste">
        {file.map((depot) => (
          <li key={depot.id}>
            <strong>{depot.nomFichier}</strong>
            <span>
              Prise le {depot.captureLe.split("-").reverse().join("/")}
              {depot.essais > 0 && ` · ${depot.essais} essai${depot.essais > 1 ? "s" : ""}`}
            </span>
            {depot.refus === null ? (
              <span>En attente de réseau</span>
            ) : (
              <span data-alerte="true">Refusée par le cabinet : {depot.refus}</span>
            )}
            <span style={{ display: "flex", gap: 8 }}>
              {depot.refus !== null && (
                <button type="button" className="adherent__quitter" onClick={() => void reessayer(depot)}>
                  Réessayer
                </button>
              )}
              <button type="button" className="adherent__quitter" onClick={() => void retirer(depot.id)}>
                Retirer
              </button>
            </span>
          </li>
        ))}
      </ul>
      {enAttente > 0 && (
        <button type="button" className="adherent__depot-envoyer" onClick={synchroniser} disabled={enSynchronisation}>
          {enSynchronisation ? "Envoi en cours…" : "Envoyer maintenant"}
        </button>
      )}
    </section>
  );
}
