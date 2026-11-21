"use client";

import { useActionState } from "react";

import {
  basculerUnCreneau,
  constaterLeRendezVous,
  fixerLAgenda,
  poserLeLien,
  saisirUneDemandeAuCabinet,
  type EtatSaisieAuCabinet,
} from "@/app/lib/actions-rendez-vous";
import {
  JOURS,
  heureLisible,
  saisieDuJour,
  type AgendaDeCreation,
  type RendezVousDuCabinet,
} from "@/app/lib/rendez-vous-etats";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";
import { Link } from "@/i18n/navigation";

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec) {
    return (
      <p role="alert" className="rdv__echec">
        {etat.echec}
      </p>
    );
  }
  if (etat.fait) {
    return (
      <p role="status" className="rdv__fait">
        {etat.fait}
      </p>
    );
  }
  return null;
}

/** Les plages, la durée et les modes : la proposition par défaut, que le responsable modifie. */
export function AgendaDuResponsable({ agenda, parDefaut }: { agenda: AgendaDeCreation; parDefaut: boolean }) {
  const [etat, fixer, enCours] = useActionState(fixerLAgenda, ETAT_ACTE_INITIAL);
  return (
    <form action={fixer} className="rdv__formulaire">
      <p className="rdv__note">
        {parDefaut
          ? "Proposition par défaut : du lundi au vendredi, 9 h–12 h et 14 h–16 h. Modifiez ou videz un jour pour le fermer."
          : `Dernière modification par ${agenda.fixe_par}.`}
      </p>
      {JOURS.map((nom, jour) => (
        <label key={nom}>
          {nom} (vide : fermé)
          <input name={`jour_${jour}`} defaultValue={saisieDuJour(agenda.plages, jour)} placeholder="09:00-12:00, 14:00-16:00" />
        </label>
      ))}
      <label>
        Durée d&rsquo;un rendez-vous (minutes)
        <input name="duree_minutes" type="number" min={15} max={240} step={5} defaultValue={agenda.duree_minutes} required />
      </label>
      <label className="rdv__case">
        <input type="checkbox" name="mode_PRESENTIEL" value="oui" defaultChecked={agenda.modes.includes("PRESENTIEL")} />
        Au cabinet
      </label>
      <label className="rdv__case">
        <input type="checkbox" name="mode_EN_LIGNE" value="oui" defaultChecked={agenda.modes.includes("EN_LIGNE")} />
        En ligne
      </label>
      <label>
        Jours fermés (AAAA-MM-JJ, séparés par des virgules)
        <input name="jours_fermes" defaultValue={agenda.jours_fermes.join(", ")} placeholder="2026-12-25, 2027-01-01" />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Enregistrer l'agenda"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

/** Un créneau proposé, ou fermé : un clic le ferme, ou le rouvre. */
export function BasculeDuCreneau({ debut, ferme }: { debut: string; ferme: boolean }) {
  const [etat, basculer, enCours] = useActionState(basculerUnCreneau, ETAT_ACTE_INITIAL);
  return (
    <form action={basculer} className="rdv__bascule">
      <input type="hidden" name="debut" value={debut} />
      <input type="hidden" name="fermer" value={ferme ? "non" : "oui"} />
      <button type="submit" className="rdv__creneau" data-ferme={ferme ? "oui" : "non"} disabled={enCours} title={ferme ? "Rouvrir" : "Fermer"}>
        {debut.slice(11, 16).replace(":", " h ")}
        {ferme ? " · fermé" : ""}
      </button>
      {etat.echec && <span role="alert" className="rdv__echec">{etat.echec}</span>}
    </form>
  );
}

/** Un rendez-vous pris : le constat après l'heure, et le lien pour un rendez-vous en ligne. */
export function LigneDeRendezVous({ ligne }: { ligne: RendezVousDuCabinet }) {
  const [constat, constater, constatEnCours] = useActionState(constaterLeRendezVous, ETAT_ACTE_INITIAL);
  const [lien, poser, lienEnCours] = useActionState(poserLeLien, ETAT_ACTE_INITIAL);
  const r = ligne.rendez_vous;
  return (
    <li className="rdv__ligne">
      <div>
        <strong>{heureLisible(r.debut)}</strong> · {r.mode === "PRESENTIEL" ? "au cabinet" : "en ligne"}
        <br />
        <Link href={`/acquisition/${r.dossier}`}>{ligne.client}</Link> · {ligne.telephone}
        {ligne.courriel ? ` · ${ligne.courriel}` : ""}
      </div>
      {r.etat === "PREVU" ? (
        <>
          <form action={constater} className="rdv__constat">
            <input type="hidden" name="identifiant" value={r.identifiant} />
            <select name="issue" defaultValue="" required>
              <option value="" disabled>
                Constater…
              </option>
              <option value="HONORE">Honoré</option>
              <option value="MANQUE">Manqué (pénalité)</option>
              <option value="ANNULE">Annulé (libère le créneau)</option>
            </select>
            <input name="motif" placeholder="Motif (facultatif)" maxLength={500} />
            <button type="submit" className="bouton-discret" disabled={constatEnCours}>
              {constatEnCours ? "…" : "Enregistrer"}
            </button>
            <Retour etat={constat} />
          </form>
          {r.mode === "EN_LIGNE" && (
            <form action={poser} className="rdv__constat">
              <input type="hidden" name="identifiant" value={r.identifiant} />
              <input name="lien" type="url" placeholder="https://…" defaultValue={r.lien ?? ""} required />
              <button type="submit" className="bouton-discret" disabled={lienEnCours}>
                {lienEnCours ? "…" : "Poser le lien"}
              </button>
              <Retour etat={lien} />
            </form>
          )}
        </>
      ) : (
        <p className="rdv__note">{r.etat === "HONORE" ? "Honoré" : r.etat === "MANQUE" ? "Manqué" : "Annulé"}</p>
      )}
    </li>
  );
}

const SERVICES: { code: string; libelle: string }[] = [
  { code: "CREATION", libelle: "Création d'entreprise" },
  { code: "ADHESION", libelle: "Adhésion au centre" },
  { code: "PONCTUEL", libelle: "Prestation ponctuelle" },
  { code: "DOMICILIATION", libelle: "Domiciliation" },
  { code: "FORMATION", libelle: "Formation" },
  { code: "AUTRE", libelle: "Autre demande" },
];

const SAISIE_INITIALE: EtatSaisieAuCabinet = { echec: null, reference: null };

/** La demande d'un client venu au cabinet, saisie par le responsable à sa place. */
export function NouvelleDemandeAuCabinet() {
  const [etat, saisir, enCours] = useActionState(saisirUneDemandeAuCabinet, SAISIE_INITIALE);
  if (etat.reference) {
    return (
      <p role="status" className="rdv__fait">
        Demande enregistrée.{" "}
        <Link href={`/acquisition/${etat.reference}`}>Ouvrir la fiche pour remplir la qualification</Link>.
      </p>
    );
  }
  return (
    <form action={saisir} className="rdv__formulaire">
      <label>
        Service
        <select name="service" defaultValue="CREATION">
          {SERVICES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.libelle}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nom du client
        <input name="nom" required minLength={2} maxLength={120} />
      </label>
      <label>
        Téléphone
        <input name="telephone" type="tel" required />
      </label>
      <label>
        Adresse électronique (pour le code de dossier)
        <input name="courriel" type="email" />
      </label>
      <label>
        Code de dossier, s&rsquo;il en a déjà un
        <input name="code" maxLength={20} placeholder="K7M4-Q2XP" />
      </label>
      <label>
        Note
        <textarea name="message" rows={3} maxLength={2000} />
      </label>
      <label className="rdv__case">
        <input type="checkbox" name="accord" value="oui" required />
        Le client accepte que ses informations soient enregistrées pour traiter sa demande.
      </label>
      <label className="rdv__case">
        <input type="checkbox" name="whatsapp" value="oui" />
        Il accepte aussi de recevoir les messages du cabinet sur WhatsApp.
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Enregistrer la demande"}
      </button>
      {etat.echec && (
        <p role="alert" className="rdv__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
