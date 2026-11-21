"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Dossier } from "@/app/lib/portefeuille";
import { Icone } from "./Icone";

/**
 * Sélecteur d'entreprise — § 8.0.
 *
 * « L'élément le plus sollicité : le collaborateur change de dossier en
 * permanence. Il doit être accessible en un geste depuis n'importe quel écran,
 * avec recherche instantanée sur la dénomination et le NIU, et un historique des
 * dossiers récents. »
 *
 * Refondu le 9 novembre 2026 (refonte visuelle avant livraison) :
 *
 * 1. Le nombre d'adhérents est COMPTÉ sur le portefeuille reçu. Il était écrit en
 *    dur (« 128 adhérents ») et mentait sur tous les cabinets.
 * 2. Les dossiers récents sont ceux ouverts SUR CE POSTE (stockage local du
 *    navigateur, cinq au plus) : une mémoire réelle, et dite comme telle. La
 *    section disparaît tant qu'elle est vide, au lieu d'un intertitre sans rien.
 * 3. Chaque dossier porte ses initiales sur une pastille de couleur stable
 *    (tirée du NIU) : l'œil retrouve un dossier avant de lire son nom.
 * 4. Ouverture au clavier : Ctrl/⌘ + J depuis n'importe quel écran ; flèches et
 *    Entrée dans la liste.
 */

const CLE_RECENTS = "cga.dossiers-recents";
const NOMBRE_DE_RECENTS = 5;

function lireRecents(): string[] {
  try {
    const brut = window.localStorage.getItem(CLE_RECENTS);
    const liste = brut ? (JSON.parse(brut) as unknown) : [];
    return Array.isArray(liste) ? liste.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function retenir(niu: string) {
  try {
    const liste = [niu, ...lireRecents().filter((n) => n !== niu)].slice(0, NOMBRE_DE_RECENTS);
    window.localStorage.setItem(CLE_RECENTS, JSON.stringify(liste));
  } catch {
    // Stockage refusé (navigation privée) : on se passe des récents.
  }
}

const MOTS_IGNORES = new Set([
  "SA", "SARL", "SAS", "SASU", "SARLU", "GIE", "ETS", "STE", "LA", "LE", "LES", "DE", "DU", "DES", "ET",
]);

/** Initiales d'une dénomination : « SARL BATIMENT PLUS » → « BP ». */
export function initiales(denomination: string): string {
  const mots = denomination
    .toLocaleUpperCase("fr")
    .split(/[\s\-'’.]+/)
    // « & », « - » et autres signes ne donnent pas d'initiale (« ETS TCHOUMBA & FILS » → « TF »).
    .filter((m) => /^[\p{L}\p{N}]/u.test(m));
  const utiles = mots.filter((m) => !MOTS_IGNORES.has(m));
  return (utiles.length > 0 ? utiles : mots)
    .slice(0, 2)
    .map((m) => m[0])
    .join("");
}

/** Une teinte stable par dossier : même NIU, même couleur, sur tous les écrans. */
function teinte(niu: string): number {
  let h = 0;
  for (const c of niu) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function Pastille({ dossier, taille = 32 }: { dossier: Dossier; taille?: number }) {
  const h = teinte(dossier.niu);
  return (
    <span
      className="selecteur__pastille"
      aria-hidden="true"
      style={{
        width: taille,
        height: taille,
        background: `hsl(${h} 55% 92%)`,
        color: `hsl(${h} 45% 28%)`,
      }}
    >
      {initiales(dossier.denomination)}
    </span>
  );
}

export function SelecteurEntreprise({
  dossiers,
  repliee,
  entrepriseCourante,
  onChangement,
}: {
  repliee: boolean;
  dossiers: Dossier[];
  entrepriseCourante: Dossier | null;
  onChangement: (entreprise: Dossier | null) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [actif, setActif] = useState(0);
  // ⚠️ Le panneau est plus large que la barre (380 px contre 240) : en position
  // absolue, il faisait défiler la barre latéralement. Il est placé en position
  // FIXE, sous le déclencheur, mesuré à l'ouverture.
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const declencheur = useRef<HTMLButtonElement>(null);
  const conteneur = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);

  // Les récents se relisent à chaque ouverture : un autre onglet a pu en ouvrir un.
  function basculer() {
    setOuvert((o) => {
      if (!o) {
        setRecents(lireRecents());
        setActif(0);
        const cadre = declencheur.current?.getBoundingClientRect();
        if (cadre) setPosition({ top: cadre.bottom + 8, left: Math.max(8, cadre.left) });
      }
      return !o;
    });
  }

  // Raccourci global : Ctrl/⌘ + J ouvre le sélecteur depuis n'importe quel écran.
  useEffect(() => {
    function auRaccourci(evenement: KeyboardEvent) {
      if ((evenement.ctrlKey || evenement.metaKey) && evenement.key.toLowerCase() === "j") {
        evenement.preventDefault();
        basculer();
      }
    }
    document.addEventListener("keydown", auRaccourci);
    return () => document.removeEventListener("keydown", auRaccourci);
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    champ.current?.focus();

    function auClic(evenement: MouseEvent) {
      if (!conteneur.current?.contains(evenement.target as Node)) setOuvert(false);
    }
    function auClavier(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  const adherents = useMemo(() => dossiers.filter((d) => d.adherente).length, [dossiers]);

  const resultats = useMemo(() => {
    const terme = requete.trim().toLocaleLowerCase("fr");
    if (!terme) return null;
    return dossiers.filter(
      (e) =>
        e.denomination.toLocaleLowerCase("fr").includes(terme) ||
        e.niu.toLocaleLowerCase("fr").includes(terme),
    );
  }, [requete, dossiers]);

  const dossiersRecents = useMemo(
    () =>
      recents
        .map((niu) => dossiers.find((d) => d.niu === niu))
        .filter((d): d is Dossier => d !== undefined),
    [recents, dossiers],
  );
  const autres = useMemo(
    () => dossiers.filter((d) => !dossiersRecents.includes(d)),
    [dossiers, dossiersRecents],
  );

  // La liste parcourue au clavier, dans l'ordre affiché.
  const parcours: (Dossier | null)[] = resultats ?? [null, ...dossiersRecents, ...autres];

  function choisir(entreprise: Dossier | null) {
    if (entreprise) retenir(entreprise.niu);
    onChangement(entreprise);
    setOuvert(false);
    setRequete("");
  }

  function auClavierDansLaListe(evenement: React.KeyboardEvent) {
    if (evenement.key === "ArrowDown") {
      evenement.preventDefault();
      setActif((i) => Math.min(i + 1, parcours.length - 1));
    } else if (evenement.key === "ArrowUp") {
      evenement.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (evenement.key === "Enter" && parcours.length > 0) {
      evenement.preventDefault();
      choisir(parcours[Math.min(actif, parcours.length - 1)]);
    }
  }

  const libelleCompte = `${adherents} adhérent${adherents > 1 ? "s" : ""}`;
  const decalage = resultats === null ? 1 : 0;

  const option = (d: Dossier, rang: number) => (
    <Option
      key={d.niu}
      entreprise={d}
      actuel={d.niu === entrepriseCourante?.niu}
      actif={rang === actif}
      onChoix={choisir}
    />
  );

  return (
    <div className="selecteur" ref={conteneur}>
      <button
        ref={declencheur}
        type="button"
        className="selecteur__declencheur"
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        title={
          entrepriseCourante
            ? `${entrepriseCourante.denomination} · changer de dossier (Ctrl + J)`
            : "Choisir un dossier (Ctrl + J)"
        }
        onClick={basculer}
      >
        {entrepriseCourante ? (
          <Pastille dossier={entrepriseCourante} taille={30} />
        ) : (
          <span className="selecteur__pastille selecteur__pastille--tous" aria-hidden="true">
            <Icone nom="portefeuille" taille={16} />
          </span>
        )}
        {!repliee && (
          <>
            <span className="selecteur__identite">
              <span className="selecteur__denomination">
                {entrepriseCourante?.denomination ?? "Tous les dossiers"}
              </span>
              <span className="selecteur__niu">
                {entrepriseCourante ? entrepriseCourante.niu : libelleCompte}
              </span>
            </span>
            <svg className="selecteur__chevrons" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M5 6l3-3 3 3M5 10l3 3 3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      {ouvert && (
        <div
          className="selecteur__panneau"
          role="listbox"
          aria-label="Choisir un dossier"
          style={{ top: position.top, left: position.left }}
          onKeyDown={auClavierDansLaListe}
        >
          <div className="selecteur__barre-recherche">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={champ}
              className="selecteur__recherche"
              type="search"
              placeholder="Dénomination ou NIU…"
              value={requete}
              onChange={(e) => {
                setRequete(e.target.value);
                setActif(0);
              }}
            />
            <kbd className="selecteur__touche">Échap</kbd>
          </div>

          <div className="selecteur__liste">
            {resultats === null ? (
              <>
                <OptionTousDossiers
                  actuel={entrepriseCourante === null}
                  actif={actif === 0}
                  libelle={libelleCompte}
                  onChoix={choisir}
                />
                {dossiersRecents.length > 0 && (
                  <>
                    <div className="selecteur__section">Récents sur ce poste</div>
                    {dossiersRecents.map((d, i) => option(d, decalage + i))}
                  </>
                )}
                <div className="selecteur__section">
                  Portefeuille <span className="selecteur__compte">{dossiers.length}</span>
                </div>
                {autres.map((d, i) => option(d, decalage + dossiersRecents.length + i))}
              </>
            ) : resultats.length === 0 ? (
              <p className="selecteur__vide">
                Aucun dossier ne correspond à «&nbsp;{requete}&nbsp;».
                <br />
                La recherche porte sur la dénomination et le NIU.
              </p>
            ) : (
              resultats.map((d, i) => option(d, i))
            )}
          </div>
          <div className="selecteur__pied" aria-hidden="true">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> parcourir
            </span>
            <span>
              <kbd>Entrée</kbd> ouvrir
            </span>
            <span>
              <kbd>Ctrl</kbd> <kbd>J</kbd> partout
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionTousDossiers({
  actuel,
  actif,
  libelle,
  onChoix,
}: {
  actuel: boolean;
  actif: boolean;
  libelle: string;
  onChoix: (e: Dossier | null) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={actuel}
      data-actif={actif || undefined}
      className="selecteur__option"
      onClick={() => onChoix(null)}
    >
      <span className="selecteur__pastille selecteur__pastille--tous" aria-hidden="true">
        <Icone nom="portefeuille" taille={16} />
      </span>
      <span className="selecteur__texte">
        <span className="selecteur__nom">Tous les dossiers</span>
        <span className="selecteur__detail">Vue consolidée · {libelle}</span>
      </span>
    </button>
  );
}

function Option({
  entreprise,
  actuel,
  actif,
  onChoix,
}: {
  entreprise: Dossier;
  actuel: boolean;
  actif: boolean;
  onChoix: (e: Dossier) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={actuel}
      data-actif={actif || undefined}
      className="selecteur__option"
      onClick={() => onChoix(entreprise)}
    >
      <Pastille dossier={entreprise} />
      <span className="selecteur__texte">
        <span className="selecteur__nom">{entreprise.denomination}</span>
        <span className="selecteur__detail tabulaire">
          {entreprise.niu}
          {entreprise.siege ? ` · ${entreprise.siege}` : ""}
        </span>
      </span>
      <span className={"selecteur__regime" + (entreprise.regime === "REEL" ? " selecteur__regime--reel" : "")}>
        {entreprise.regime === "REEL" ? "Réel" : "IGS"}
      </span>
    </button>
  );
}
