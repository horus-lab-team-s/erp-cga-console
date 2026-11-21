"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import type { Compteurs, Dossier } from "@/app/lib/portefeuille";
import type { Acces } from "@/app/lib/acces";
import { ContexteAnnonce } from "./annonce";
import { BarreLaterale } from "./BarreLaterale";
import { Icone } from "./Icone";

/**
 * E00 · Structure générale.
 *
 * Le cadre dans lequel tous les écrans collaborateur s'inscrivent : barre
 * latérale, zone de travail. L'en-tête est rendu par chaque page, parce que le
 * fil d'Ariane et les actions dépendent de l'écran.
 *
 * Le dossier sélectionné vit ici plutôt que dans l'URL : le collaborateur change
 * de dossier en gardant le même écran, et l'inverse est tout aussi fréquent. Le
 * jour où un lien devra pointer vers « ce dossier sur cet écran », ce sera un
 * paramètre de requête, pas une refonte.
 *
 * Sous 1000 px, la barre latérale sort du flux et devient un tiroir. Ses 240 px
 * fixes prenaient les deux tiers d'un écran de téléphone et il ne restait rien
 * pour travailler.
 *
 * Le bouton d'ouverture est rendu **ici** et non dans `EnteteTravail` : l'en-tête
 * appartient à chaque écran, alors que la barre appartient à la coquille. Le
 * placer là évite d'avoir à modifier chaque page — et d'oublier celles à venir.
 *
 * L'ACCÈS ET LES DOSSIERS VIENNENT DU SERVEUR
 *
 * Ils sont lus dans le gabarit et descendus en propriétés. Ce composant reste
 * client — il porte l'état du tiroir et du dossier sélectionné — mais il ne
 * décide de rien : la liste qu'il reçoit est **déjà restreinte** au périmètre de
 * la session, et les permissions qu'il consulte ont été résolues par le backend.
 */
const ContexteDossier = createContext<{
  entreprise: Dossier | null;
  choisir: (entreprise: Dossier | null) => void;
  acces: Acces | null;
  dossiers: Dossier[];
  /** Pas 94 : lu une fois par le gabarit, affiché par la cloche de chaque en-tête. */
  notificationsNonLues: number;
  /** Une page qui montre un seul dossier le déclare, pour que le sélecteur le montre aussi. */
  declarerDossierAffiche: (niu: string | null) => void;
  /**
   * Annoncer le résultat d'un geste dont le bloc disparaît aussitôt (9 novembre 2026) :
   * une écriture validée quitte la liste des brouillons, un mois validé quitte la file,
   * et leur message s'en allait avec eux. La coquille, elle, reste.
   */
  annoncer: (texte: string) => void;
}>({
  annoncer: () => {},
  entreprise: null,
  choisir: () => {},
  acces: null,
  dossiers: [],
  notificationsNonLues: 0,
  declarerDossierAffiche: () => {},
});

/**
 * Dossier actuellement sélectionné, et ce que la session permet.
 *
 * `entreprise` à `null` = vue consolidée du portefeuille — de **son**
 * portefeuille, qui n'est pas nécessairement celui du cabinet.
 */
export function useDossier() {
  return useContext(ContexteDossier);
}


export function Coquille({
  acces,
  dossiers,
  compteurs,
  notificationsNonLues = 0,
  children,
}: {
  acces: Acces;
  dossiers: Dossier[];
  compteurs: Compteurs;
  notificationsNonLues?: number;
  children: ReactNode;
}) {
  // ⚠️ L'ADRESSE FAIT FOI (9 novembre 2026). Le choix du sélecteur ne vivait que dans
  // cet état : aucune page ne le lisait — elles lisent `?dossier=` — et le sélecteur
  // affichait « Tous les dossiers » pendant que l'écran montrait le premier du
  // portefeuille. Choisir pousse maintenant `?dossier=` dans l'adresse ; le sélecteur
  // montre ce que l'adresse ou la page disent ; les liens de la barre gardent le choix.
  const router = useRouter();
  const chemin = usePathname();
  const parametres = useSearchParams();
  const parAdresse = parametres.get("dossier");
  const [retenu, setRetenu] = useState<string | null>(parAdresse);
  const [affiche, setAffiche] = useState<string | null>(null);
  // Un lien profond (`?dossier=` venu d'ailleurs) devient le choix retenu.
  if (parAdresse && parAdresse !== retenu) setRetenu(parAdresse);
  const trouver = (niu: string | null) => (niu ? (dossiers.find((d) => d.niu === niu) ?? null) : null);
  const entreprise = trouver(parAdresse) ?? trouver(affiche);

  function choisir(choix: Dossier | null) {
    setRetenu(choix?.niu ?? null);
    const suite = new URLSearchParams(parametres.toString());
    // Une page numérotée ne survit pas au changement de dossier.
    suite.delete("page");
    if (choix) suite.set("dossier", choix.niu);
    else suite.delete("dossier");
    const requete = suite.toString();
    router.push(requete ? `${chemin}?${requete}` : chemin);
  }

  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const [annonce, setAnnonce] = useState<{ texte: string; rang: number } | null>(null);
  const annoncer = useCallback((texte: string) => setAnnonce((a) => ({ texte, rang: (a?.rang ?? 0) + 1 })), []);
  useEffect(() => {
    if (!annonce) return;
    const minuterie = window.setTimeout(() => setAnnonce(null), 6000);
    return () => window.clearTimeout(minuterie);
  }, [annonce]);

  useEffect(() => {
    if (!tiroirOuvert) return;
    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setTiroirOuvert(false);
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [tiroirOuvert]);

  return (
    <ContexteDossier.Provider
      value={{ entreprise, choisir, acces, dossiers, notificationsNonLues, declarerDossierAffiche: setAffiche, annoncer }}
    >
      <ContexteAnnonce.Provider value={{ annoncer }}>
      <div className="coquille" data-tiroir={tiroirOuvert}>
        <button
          type="button"
          className="coquille__menu"
          onClick={() => setTiroirOuvert((ouvert) => !ouvert)}
          aria-expanded={tiroirOuvert}
          aria-label={tiroirOuvert ? "Fermer le menu" : "Ouvrir le menu"}
        >
          <Icone nom={tiroirOuvert ? "fermer" : "menu"} taille={20} />
        </button>

        {/* Le voile n'existe que tiroir ouvert : un élément permanent à
            `pointer-events: none` intercepterait quand même le survol sur
            certains navigateurs anciens. */}
        {tiroirOuvert && (
          <div
            className="coquille__voile"
            onClick={() => setTiroirOuvert(false)}
            aria-hidden="true"
          />
        )}

        {/* Suivre un lien referme le tiroir : le laisser ouvert masquerait
            l'écran qu'on vient de demander. On l'intercepte au clic plutôt que
            dans un effet observant le chemin — un effet provoquerait un rendu
            de plus à chaque navigation, tiroir fermé compris. */}
        <div
          className="coquille__barre"
          onClick={(evenement) => {
            if ((evenement.target as HTMLElement).closest("a")) setTiroirOuvert(false);
          }}
        >
          <BarreLaterale
            acces={acces}
            dossiers={dossiers}
            compteurs={compteurs}
            entrepriseCourante={entreprise}
            dossierRetenu={parAdresse ?? retenu}
            onChangementEntreprise={choisir}
          />
        </div>
        <div className="zone-travail">{children}</div>
        <div className="annonce-coquille" role="status" aria-live="polite">
          {annonce && (
            <p key={annonce.rang} className="annonce-coquille__texte">
              <span aria-hidden="true">✓</span> {annonce.texte}
              <button type="button" onClick={() => setAnnonce(null)} aria-label="Fermer l'annonce">
                ×
              </button>
            </p>
          )}
        </div>
      </div>
      </ContexteAnnonce.Provider>
    </ContexteDossier.Provider>
  );
}
