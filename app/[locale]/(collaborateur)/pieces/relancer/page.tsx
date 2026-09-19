import type { Metadata } from "next";

import { Montant } from "@/app/components/Montant";
import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EnvoyerLaRelance } from "@/app/components/collecte/EnvoyerLaRelance";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { lireDossiers } from "@/app/lib/portefeuille";
import { lireLaRelance, type AttenteDePiece, type VueDeRelance } from "@/app/lib/relance-des-pieces";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Relancer un adhérent — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Relancer un adhérent des pièces qui manquent à son mois (pas 111).
 * Maquette « Parcours comptable », vue F (UC09).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI MANQUE SE DÉDUIT, LE MESSAGE SE REND AU BACKEND
 *
 * * **Ce qui manque** vient du pilotage, qui le déduit des faits : relevés bancaires, mouvements
 *   sans pièce, séries habituelles, obligations du mois, anomalies bloquantes, demandes ouvertes.
 * * **Cocher et choisir le modèle** se fait par un formulaire ordinaire (GET) : « Mettre à jour
 *   l'aperçu » recharge la page, et le backend rend le message. L'écran ne compose rien, et
 *   l'aperçu est exactement ce qui partira.
 * * **Envoyer** : les canaux, puis l'envoi. Le backend refuse une pièce hors attente, un canal
 *   inactif, un dossier sans adhérent, une seconde relance le même jour par le même canal.
 *
 * Hors du pas : « Programmer le 11/08 » (une relance différée demande un ordonnanceur de
 * messages, qui n'existe que pour la souscription).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ORIGINES: Record<AttenteDePiece["origine"], string> = {
  DEMANDE_OUVERTE: "Demande déjà émise",
  RELEVE_BANCAIRE: "Banque mouvementée, relevé non reçu",
  MOUVEMENT_SANS_PIECE: "Mouvement bancaire sans pièce",
  SERIE_HABITUELLE: "Série habituelle du dossier",
  OBLIGATION_DU_MOIS: "Obligation du mois",
  ANOMALIE_BLOQUANTE: "Anomalie bloquante",
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function nomDuMois(mois: string): string {
  return `${MOIS[Number(mois.slice(5, 7)) - 1]} ${mois.slice(0, 4)}`;
}

function moisPrecedent(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
}

const champ: React.CSSProperties = { padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" };
const etiquette: React.CSSProperties = { display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" };

export default async function RelancerUnAdherent({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; mois?: string; attentes?: string | string[]; modele?: string; choix?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "RELANCER_PIECES")) {
    return <EcranReserve titre="Relancer un adhérent" permission="RELANCER_PIECES" acces={acces} />;
  }
  const brut = await searchParams;
  const miettes = [{ libelle: "Pièces justificatives", href: "/pieces" }, { libelle: "Relancer un adhérent" }];
  const dossiers = await lireDossiers();
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier dans votre périmètre" />
        </div>
      </>
    );
  }
  const dossier = dossiers.some((d) => d.niu === brut.dossier) ? (brut.dossier as string) : dossiers[0].niu;
  const mois = /^\d{4}-(0[1-9]|1[0-2])$/.test(brut.mois ?? "") ? (brut.mois as string) : moisPrecedent();
  // `choix=1` : le formulaire a été envoyé, et aucune case cochée veut dire « aucune ». Sans lui
  // (première visite), toutes les pièces sont proposées.
  const coches = brut.attentes === undefined ? [] : Array.isArray(brut.attentes) ? brut.attentes : [brut.attentes];
  const selection = brut.choix ? coches : null;

  let vue: VueDeRelance | null = null;
  let erreur: string | null = null;
  try {
    vue = await lireLaRelance(dossier, mois, selection, brut.modele ?? null);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : String(cause);
  }

  const choixDuDossier = (
    <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", padding: "12px 16px" }}>
      <label style={{ ...etiquette, flex: "1 1 220px" }}>
        Dossier
        <select name="dossier" defaultValue={dossier} style={champ}>
          {dossiers.map((d) => (
            <option key={d.niu} value={d.niu}>
              {d.denomination}
            </option>
          ))}
        </select>
      </label>
      <label style={etiquette}>
        Mois
        <input type="month" name="mois" defaultValue={mois} style={champ} />
      </label>
      <button type="submit" className="action-secondaire">
        Afficher
      </button>
    </form>
  );

  if (!vue) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <div className="page-travail__titre">
            <h1>Relancer un adhérent</h1>
          </div>
          <Panneau titre="Dossier et mois">{choixDuDossier}</Panneau>
          <EtatErreur titre="La relance ne se prépare pas" detail={erreur ?? ""} />
        </div>
      </>
    );
  }

  const retenues = new Set(vue.selection);
  return (
    <>
      <EnteteTravail miettes={miettes} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Relancer un adhérent</h1>
          <p>
            {vue.denomination} · {nomDuMois(vue.mois)} · {vue.attentes.length} pièce{vue.attentes.length > 1 ? "s" : ""} attendue
            {vue.attentes.length > 1 ? "s" : ""}
            {vue.derniere_relance && ` · dernière relance le ${dateCourte(vue.derniere_relance)}`}
          </p>
        </div>

        <Panneau titre="Dossier et mois">{choixDuDossier}</Panneau>

        <form method="get" className="page-travail__duo" style={{ alignItems: "start" }}>
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="mois" value={mois} />
          <input type="hidden" name="choix" value="1" />
          <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
            <Panneau titre="Ce qui manque" aide="Déduit des relevés, des séries habituelles, des obligations et des anomalies">
              {vue.attentes.length === 0 ? (
                <EtatVide titre="Rien ne manque" detail="Aucune pièce attendue n'a été déduite pour ce mois." />
              ) : (
                <>
                  <p style={{ margin: 0, padding: "8px 14px", font: "400 12px/1.5 var(--police-texte)" }}>
                    <Link href={`/pieces/relancer?dossier=${encodeURIComponent(dossier)}&mois=${mois}${vue.modele ? `&modele=${vue.modele}` : ""}`}>Tout sélectionner</Link>
                  </p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", font: "400 12.5px/1.5 var(--police-texte)" }}>
                      <thead>
                        <tr style={{ background: "var(--brand-indigo-100)", textAlign: "left" }}>
                          <th style={{ padding: "6px 10px", width: 28 }} />
                          <th style={{ padding: "6px 10px" }}>Pièce attendue</th>
                          <th style={{ padding: "6px 10px" }}>Origine de l&rsquo;attente</th>
                          <th style={{ padding: "6px 10px", textAlign: "right" }}>Montant estimé</th>
                          <th style={{ padding: "6px 10px" }}>Demandée le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vue.attentes.map((a) => (
                          <tr key={a.code} style={{ borderBottom: "1px solid var(--line-100)", background: retenues.has(a.code) ? "var(--brand-magenta-100)" : undefined }}>
                            <td style={{ padding: "6px 10px" }}>
                              <input type="checkbox" name="attentes" value={a.code} defaultChecked={retenues.has(a.code)} aria-label={`Demander : ${a.libelle}`} />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              {a.libelle}
                              {a.regle && <span style={{ color: "var(--ink-500)" }}> · règle {a.regle}</span>}
                              {/* Pas 112 : on ne relance pas celui qui a répondu « la semaine prochaine » avant-hier. */}
                              {a.reponse && a.reponse_le && (
                                <span style={{ display: "block", color: "var(--success)" }}>
                                  L&rsquo;adhérent a répondu le {dateCourte(a.reponse_le)} : {a.reponse}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "6px 10px", color: "var(--ink-500)" }}>{ORIGINES[a.origine]}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}>{a.montant_estime ? <Montant valeur={a.montant_estime} /> : "—"}</td>
                            <td style={{ padding: "6px 10px", color: a.demandee_le ? "var(--warning)" : "var(--ink-500)" }}>{a.demandee_le ? dateCourte(a.demandee_le) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panneau>

            <Panneau titre="Historique des relances">
              {vue.historique.length === 0 ? (
                <EtatVide titre="Aucune relance" detail="Ni envoyée depuis cet écran, ni tracée à la main." />
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: "6px 14px" }}>
                  {vue.historique.map((h, rang) => (
                    <li key={rang} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", padding: "6px 0", borderBottom: "1px solid var(--line-100)", font: "400 12.5px/1.5 var(--police-texte)" }}>
                      <span style={{ color: "var(--ink-500)", fontVariantNumeric: "tabular-nums" }}>{dateCourte(h.quand)}</span>
                      <strong>{h.canal}</strong>
                      <span style={{ flex: "1 1 200px", minWidth: 0 }}>{h.contenu}</span>
                      <span style={{ color: h.etat === "Lu" ? "var(--success)" : h.etat === "Non lu" ? "var(--warning)" : "var(--ink-500)", fontWeight: 600 }}>{h.etat}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panneau>
          </div>

          <Panneau titre="Message">
            <div style={{ display: "grid", gap: 10, padding: "12px 14px" }}>
              <label style={etiquette}>
                Modèle
                <select name="modele" defaultValue={vue.modele} style={champ}>
                  {vue.modeles.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.libelle}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <button type="submit" className="action-secondaire">
                  Mettre à jour l&rsquo;aperçu
                </button>
              </div>
              <div style={{ padding: "10px 12px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", background: "var(--surface-alt)", font: "400 13px/1.6 var(--police-texte)" }}>
                <p style={{ margin: 0 }}>Bonjour{vue.destinataires[0] ? ` ${vue.destinataires[0].split(" ")[0]}` : ""},</p>
                <p style={{ margin: "4px 0" }}>{vue.apercu.introduction}</p>
                <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
                  {vue.apercu.liste.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <p style={{ margin: "4px 0" }}>{vue.apercu.conclusion}</p>
                <p style={{ margin: 0 }}>{vue.apercu.signature}</p>
              </div>
              <p style={{ margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                La liste des pièces cochées est insérée automatiquement. Le message part aussi en notification dans l&rsquo;espace de l&rsquo;adhérent
                {vue.destinataires.length > 0 ? ` (${vue.destinataires.join(", ")})` : ""}.
                {vue.echeance_depassee && " L'échéance du mois est passée : la date annoncée est reportée après l'envoi."}
                {vue.date_limite_estimee && " Aucune échéance de référence connue : la date annoncée est estimée."}
              </p>
            </div>
          </Panneau>
        </form>

        {detient(acces, "RELANCER_PIECES") && vue.attentes.length > 0 && (
          <Panneau titre="Envoyer" aide={`${vue.selection.length} pièce${vue.selection.length > 1 ? "s" : ""} cochée${vue.selection.length > 1 ? "s" : ""} dans l'aperçu`}>
            <div style={{ padding: "12px 14px" }}>
              <EnvoyerLaRelance dossier={dossier} mois={mois} modele={vue.modele} attentes={vue.selection} canaux={vue.canaux} sansDestinataire={vue.destinataires.length === 0} />
            </div>
          </Panneau>
        )}
      </div>
    </>
  );
}
