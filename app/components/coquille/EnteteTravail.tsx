"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  lireModificateur,
  modificateurParDefaut,
  souscrirePlateforme,
} from "@/app/lib/preferences";
import { initiales } from "@/app/lib/acces";
import { Link as LienLocalise, useRouter } from "@/i18n/navigation";
import { useDossier } from "./Coquille";
import { Icone } from "./Icone";

export type Miette = { libelle: string; href?: string };

/**
 * En-tête de la zone de travail — § 6.1 : fil d'Ariane, recherche globale, accès
 * aux notifications, nom de l'utilisateur.
 *
 * L'identité vient du contexte de la coquille, qui la tient de la session. Elle
 * n'est pas passée en propriété : chaque écran devrait alors la transmettre, et
 * l'un d'eux finirait par l'oublier.
 */
export function EnteteTravail({
  miettes,
  notifications,
  requete = "",
}: {
  miettes: Miette[];
  /** Laisse vide : le compteur vient de la coquille (pas 94). */
  notifications?: number;
  /** La recherche en cours, pour la laisser dans le champ sur l'écran de résultats. */
  requete?: string;
}) {
  const { acces, notificationsNonLues } = useDossier();
  const nonLues = notifications ?? notificationsNonLues;
  const routeur = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  // ⚠️ Pas 93 : le raccourci était affiché et ne faisait rien. Il donne le focus au champ.
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
      }
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);
  // Le raccourci affiché doit correspondre au clavier réel.
  const modificateur = useSyncExternalStore(
    souscrirePlateforme,
    lireModificateur,
    modificateurParDefaut,
  );

  return (
    <header className="entete">
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        {miettes.map((miette, index) => {
          const dernier = index === miettes.length - 1;
          return (
            <span key={`${miette.libelle}-${index}`} style={{ display: "contents" }}>
              {index > 0 && <span aria-hidden="true">/</span>}
              {miette.href && !dernier ? (
                <Link href={miette.href}>{miette.libelle}</Link>
              ) : (
                <span className="fil-ariane__actuel" aria-current={dernier ? "page" : undefined}>
                  {miette.libelle}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {/* ⚠️ Pas 93 : ce bouton était décoratif depuis la première coquille. C'est
          désormais un formulaire : la recherche fédérée s'ouvre sur /recherche. */}
      <form
        role="search"
        className="recherche-globale"
        onSubmit={(e) => {
          e.preventDefault();
          const q = champ.current?.value.trim() ?? "";
          if (q) routeur.push(`/recherche?q=${encodeURIComponent(q)}`);
        }}
      >
        <Icone nom="recherche" taille={15} />
        <input
          ref={champ}
          name="q"
          type="search"
          defaultValue={requete}
          placeholder="Recherche globale"
          aria-label="Recherche globale : dossier, pièce, compte, demande"
          style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", font: "inherit", color: "var(--ink-900)", outline: "none" }}
        />
        <kbd className="raccourci">{modificateur} K</kbd>
      </form>

      {/* ⚠️ Pas 94 : cette cloche était un bouton sans action. Elle mène aux notifications,
          et sa pastille dit combien sont non lues, en clair pour le lecteur d'écran. */}
      <LienLocalise
        href="/notifications"
        className="entete__action"
        aria-label={nonLues > 0 ? `Notifications, ${nonLues} non lue${nonLues > 1 ? "s" : ""}` : "Notifications"}
      >
        <Icone nom="notifications" taille={17} />
        {nonLues > 0 && <span className="entete__point" />}
      </LienLocalise>

      <div className="entete__utilisateur">
        <span className="entete__avatar" aria-hidden="true">
          {acces ? initiales(acces.nom_complet) : "—"}
        </span>
        {acces?.nom_complet ?? ""}
      </div>
    </header>
  );
}
