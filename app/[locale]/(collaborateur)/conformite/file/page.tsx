import type { Metadata } from "next";

import { Cellule, EnteteTableau, EtatVide, LigneTableau, Panneau, type Colonne } from "@/app/components/Tableau";
import { BadgeGravite } from "@/app/components/Gravite";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { FileAuClavier } from "@/app/components/conformite/FileAuClavier";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { lireLaFileDAnomalies, type VueDeLaFile } from "@/app/lib/conformite-revue";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "File d'anomalies — Plateforme CGA" };
export const dynamic = "force-dynamic";

const COLONNES: Colonne[] = [
  { cle: "gravite", libelle: "Gravité", largeur: "130px" },
  { cle: "entreprise", libelle: "Entreprise", largeur: "minmax(0, 1.4fr)" },
  { cle: "regle", libelle: "Règle", largeur: "minmax(0, 1.6fr)" },
  { cle: "enjeu", libelle: "Enjeu fiscal", largeur: "130px", aDroite: true },
  { cle: "anciennete", libelle: "Ancienneté", largeur: "120px" },
  { cle: "depose", libelle: "Déposée par", largeur: "minmax(0, 1fr)" },
];

/**
 * La file d'anomalies du réviseur (pas 117, maquette « Parcours réviseur », vue A).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TOUT LE PORTEFEUILLE, PAR GRAVITÉ ET PAR ENJEU
 *
 * Le produit savait déjà tout faire dossier par dossier (la boîte de réception) ou règle par règle
 * (l'écart en masse, la qualité des règles). Il ne savait pas dire « voici vos six constats
 * bloquants, le plus coûteux d'abord ». L'ordre, les compteurs et les groupes arrivent calculés :
 * l'écran ne trie ni ne compte rien.
 *
 * ⚠️ « Déposée par » et non « Collaborateur » : pour une pièce déposée au portail, la collecte
 * porte le nom de l'entreprise. Nommer cette colonne « collaborateur » ferait chercher un coupable
 * au cabinet.
 *
 * ⚠️ Les filtres sont des paramètres d'adresse (formulaire GET) : le lien d'une file filtrée se
 * colle dans un message. Les compteurs de l'en-tête, eux, restent ceux de la file entière.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function FileDAnomalies({
  searchParams,
}: {
  searchParams: Promise<{ gravite?: string; entreprise?: string; regle?: string; depose_par?: string; du?: string; au?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "CONTROLER_CONFORMITE")) {
    return <EcranReserve titre="File d'anomalies" permission="CONTROLER_CONFORMITE" acces={acces} />;
  }
  const filtres = await searchParams;
  let vue: VueDeLaFile | string;
  try {
    vue = await lireLaFileDAnomalies(filtres);
  } catch (erreur) {
    if (!(erreur instanceof ErreurApi)) throw erreur;
    vue = erreur.message;
  }

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Conformité", href: "/conformite" }, { libelle: "File d'anomalies" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>File d&rsquo;anomalies</h1>
          <p>
            {typeof vue === "string"
              ? "Tout le portefeuille, par gravité et par enjeu fiscal."
              : `Tout votre périmètre · ${Object.entries(vue.par_gravite)
                  .map(([g, n]) => `${n} ${LIBELLE_COMPTEUR[g] ?? g.toLowerCase()}${n > 1 ? "s" : ""}`)
                  .join(" · ")} · un constat de plus de ${vue.seuil_anciennete_jours} jours passe devant dans sa gravité`}
          </p>
        </div>

        {typeof vue === "string" ? (
          <Panneau titre="La file ne se lit pas">
            <EtatVide titre="La file ne se lit pas" detail={vue} />
          </Panneau>
        ) : (
          <>
            <Panneau titre="Filtrer" aide="Les compteurs ci-dessus restent ceux de la file entière : filtrer ne fait pas disparaître le travail.">
              <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "10px 16px", alignItems: "flex-end" }}>
                <Champ libelle="Gravité" nom="gravite" valeur={filtres.gravite}>
                  <option value="">Toutes</option>
                  {["BLOQUANT", "MAJEUR", "AVERTISSEMENT"].map((g) => (
                    <option key={g} value={g}>
                      {LIBELLE_COMPTEUR[g]}
                    </option>
                  ))}
                </Champ>
                <Champ libelle="Entreprise" nom="entreprise" valeur={filtres.entreprise}>
                  <option value="">Toutes</option>
                  {vue.dossiers.map((d) => (
                    <option key={d.niu} value={d.niu}>
                      {d.denomination}
                    </option>
                  ))}
                </Champ>
                <Champ libelle="Règle" nom="regle" valeur={filtres.regle}>
                  <option value="">Toutes</option>
                  {vue.groupes.map((g) => (
                    <option key={g.code_regle} value={g.code_regle}>
                      {g.code_regle}
                    </option>
                  ))}
                </Champ>
                <Champ libelle="Déposée par" nom="depose_par" valeur={filtres.depose_par}>
                  <option value="">Tous</option>
                  {vue.deposants.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Champ>
                <label style={ETIQUETTE}>
                  Pièces du
                  <input type="date" name="du" defaultValue={filtres.du ?? ""} style={CHAMP} />
                </label>
                <label style={ETIQUETTE}>
                  au
                  <input type="date" name="au" defaultValue={filtres.au ?? ""} style={CHAMP} />
                </label>
                <button type="submit" className="bouton-discret">
                  Afficher
                </button>
                <Link href="/conformite/file" style={{ font: "500 12.5px/1.4 var(--police-texte)" }}>
                  Tout afficher
                </Link>
              </form>
            </Panneau>

            <Panneau
              titre={`À traiter (${vue.lignes.length})`}
              aide="↑↓ parcourir · ↵ ouvrir la pièce. L'ordre : gravité, ce qui dort, enjeu fiscal, ancienneté."
            >
              {vue.lignes.length === 0 ? (
                <EtatVide
                  titre="Rien à décider"
                  detail="Aucun constat en attente sur ce périmètre, avec ces filtres. Les écarts en attente d'un second regard sont sur le journal des dérogations."
                />
              ) : (
                <>
                  <FileAuClavier nombre={vue.lignes.length} />
                  <EnteteTableau colonnes={COLONNES} />
                  {vue.lignes.map((l, rang) => (
                    <LigneTableau key={`${l.piece}-${l.code_regle}`} colonnes={COLONNES} ton={rang % 2 ? "alterne" : "normal"}>
                      <Cellule>
                        <BadgeGravite severite={l.gravite} court />
                      </Cellule>
                      <Cellule gras titre={l.fournisseur ?? undefined}>
                        {/* La ligne entière mène à la pièce : c'est ce que « ↵ ouvrir la pièce » fait. */}
                        <Link href={`/pieces/${encodeURIComponent(l.piece)}`} data-ligne-anomalie="">
                          {l.denomination}
                        </Link>
                      </Cellule>
                      <Cellule titre={`${l.message} · pièce ${l.piece} du ${dateCourte(l.date_piece)}`}>
                        {l.code_regle} · {l.libelle_regle}
                      </Cellule>
                      <Cellule tabulaire>{l.enjeu ? montantFcfa(l.enjeu) : "non chiffré"}</Cellule>
                      <Cellule>
                        <span style={{ color: l.dort ? "var(--danger)" : undefined, fontWeight: l.dort ? 600 : undefined }}>
                          {l.anciennete} jour{l.anciennete > 1 ? "s" : ""}
                          {l.dort ? " · dort" : ""}
                        </span>
                      </Cellule>
                      <Cellule>{l.depose_par ?? "inconnu"}</Cellule>
                    </LigneTableau>
                  ))}
                </>
              )}
            </Panneau>

            <Panneau
              titre="Grouper par règle"
              aide="Le gain du profil : traiter d'un bloc les constats d'une même règle, avec un motif unique."
            >
              {vue.groupes.length === 0 ? (
                <EtatVide titre="Aucune règle en cause" />
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {vue.groupes.map((g) => (
                    <li key={g.code_regle} style={{ padding: "10px 16px", borderTop: "1px solid var(--line-100)", font: "400 13px/1.5 var(--police-texte)" }}>
                      <Link href={`/conformite/regles/${encodeURIComponent(g.code_regle)}`}>
                        <strong>{g.code_regle}</strong> · {g.libelle_regle}
                      </Link>{" "}
                      · {g.constats} constat{g.constats > 1 ? "s" : ""} · {g.dossiers} dossier{g.dossiers > 1 ? "s" : ""} ·
                      enjeu cumulé {montantFcfa(g.enjeu_cumule)} ·{" "}
                      <Link href={`/conformite/file?regle=${encodeURIComponent(g.code_regle)}`}>ne voir que cette règle</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panneau>
          </>
        )}
      </div>
    </>
  );
}

const LIBELLE_COMPTEUR: Record<string, string> = {
  BLOQUANT: "bloquante",
  MAJEUR: "majeure",
  AVERTISSEMENT: "avertissement",
};

const ETIQUETTE: React.CSSProperties = { font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-500)" };
const CHAMP: React.CSSProperties = {
  display: "block",
  marginTop: 2,
  padding: "5px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

function Champ({
  libelle,
  nom,
  valeur,
  children,
}: {
  libelle: string;
  nom: string;
  valeur: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label style={ETIQUETTE}>
      {libelle}
      <select name={nom} defaultValue={valeur ?? ""} style={CHAMP}>
        {children}
      </select>
    </label>
  );
}
