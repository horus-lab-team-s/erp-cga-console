"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { COMPTEURS, UTILISATEUR, type Entreprise } from "@/app/lib/donnees-demo";
import { NAVIGATION, NAVIGATION_ADMINISTRATION, type EntreeNav } from "@/app/lib/navigation";
import { basculerRepli, lireRepli, repliParDefaut, souscrireRepli } from "@/app/lib/preferences";
import { Icone } from "./Icone";
import { SelecteurEntreprise } from "./SelecteurEntreprise";

/**
 * E00 · Barre latérale de l'espace collaborateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ORDRE DES ENTRÉES EST UN CHOIX MÉTIER
 *
 * Il suit le trajet réel d'une pièce dans le cabinet : elle arrive, on la
 * contrôle, on la comptabilise, on déclare, on clôture. Un collaborateur qui
 * descend la barre suit la vie d'un dossier, et un débutant apprend le métier en
 * lisant le menu. Le raisonnement complet, et l'organisation alternative « par
 * rôle » qui a été écartée, sont consignés en tête de `app/lib/navigation.ts` —
 * c'est là que la décision se change, pas ici.
 *
 * CE QUE PORTE LA BARRE, DE HAUT EN BAS
 *
 * La marque, le sélecteur d'entreprise, les écrans de travail, le groupe
 * Administration (réservé), le bouton de repli, puis — en pied — la sortie vers
 * le site public et le compte connecté.
 *
 * LE REPLI EST UNE PRÉFÉRENCE, PAS UN ÉTAT DE PAGE
 *
 * Il est lu par `useSyncExternalStore` sur le magasin `preferences` plutôt que
 * par un `useState` doublé d'un effet. Conséquence directe : le serveur rend la
 * barre dépliée, le client applique la préférence enregistrée en une seule
 * passe, et le collaborateur ne voit pas la barre s'ouvrir puis se refermer sous
 * ses yeux à chaque navigation.
 *
 * LES PASTILLES DE COMPTE
 *
 * Elles tombent en haut, là où le regard commence, et ne s'affichent qu'à partir
 * de un : une pastille « 0 » est du bruit. Leur ton distingue ce qui bloque
 * (`alerte`) de ce qui attend (`neutre`) — la couleur seule ne suffisant pas,
 * chaque pastille porte aussi son `aria-label`.
 *
 * ⚠️ Les compteurs et l'utilisateur viennent de `donnees-demo` : ce sont des
 * valeurs de démonstration, à remplacer par le contexte K · Transverse quand
 * l'identité et les rôles existeront.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function BarreLaterale({
  entrepriseCourante,
  onChangementEntreprise,
}: {
  entrepriseCourante: Entreprise | null;
  onChangementEntreprise: (entreprise: Entreprise | null) => void;
}) {
  const chemin = usePathname();
  // Le repli est persisté par utilisateur — § 10.6. Il est lu comme un magasin
  // externe : le serveur rend la barre dépliée, le client applique la préférence
  // en une seule passe, sans clignotement.
  const repliee = useSyncExternalStore(souscrireRepli, lireRepli, repliParDefaut);

  return (
    <nav
      className="barre"
      data-repliee={repliee}
      aria-label="Navigation principale"
      style={{ ["--largeur" as string]: repliee ? "64px" : "240px" }}
    >
      <div className="barre__marque">
        {/* Le logo monochrome blanc est fourni en PNG. Une version SVG reste
            préférable pour ce fond sombre — voir question Q10. */}
        <Image
          src="/marque/cga-logo-blanc.png"
          alt="CGA Broad Range Consulting Group"
          width={repliee ? 40 : 128}
          height={repliee ? 22 : 70}
          priority
          style={{ height: "auto", width: repliee ? 40 : 128 }}
        />
      </div>

      <SelecteurEntreprise
        repliee={repliee}
        entrepriseCourante={entrepriseCourante}
        onChangement={onChangementEntreprise}
      />

      <div className="barre__separateur" />

      {NAVIGATION.map((entree) => (
        <Entree key={entree.href} entree={entree} chemin={chemin} repliee={repliee} />
      ))}

      <div className="barre__separateur" />
      {!repliee && <div className="barre__groupe">Administration</div>}
      {NAVIGATION_ADMINISTRATION.map((entree) => (
        <Entree key={entree.href} entree={entree} chemin={chemin} repliee={repliee} />
      ))}

      <button type="button" className="barre__bouton-repli" onClick={basculerRepli}>
        <Icone nom={repliee ? "deplier" : "replier"} taille={16} />
        {!repliee && "Replier le menu"}
      </button>

      <div className="barre__separateur" />

      {/* Retour au site public.
          L'espace de travail n'a aucune autre sortie : ni en-tête de vitrine, ni
          pied de page. Un collaborateur qui veut vérifier ce qu'un adhérent voit
          — un tarif affiché, un article du blog — devait retaper l'adresse. Placé
          au-dessus du compte, avec la même discrétion : c'est une sortie, pas une
          entrée de navigation, et il n'a rien à faire dans la liste des écrans. */}
      <Link
        href="/"
        className="barre__retour-vitrine"
        title="Retour au site public"
        aria-label="Retour au site public"
      >
        <Icone nom="retour" taille={16} />
        {!repliee && "Retour au site"}
      </Link>

      <div className="barre__compte" title={`${UTILISATEUR.nom} — ${UTILISATEUR.role}`}>
        <span className="barre__compte-jeton">{UTILISATEUR.initiales}</span>
        {!repliee && (
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {UTILISATEUR.nom}
            </span>
            <span style={{ display: "block", font: "400 10.5px/1.4 var(--police-texte)" }}>
              {UTILISATEUR.role}
            </span>
          </span>
        )}
      </div>
    </nav>
  );
}

function Entree({
  entree,
  chemin,
  repliee,
}: {
  entree: EntreeNav;
  chemin: string;
  repliee: boolean;
}) {
  // Une entrée est active sur son propre chemin et sur ses sous-chemins, sinon
  // « Comptabilité » s'éteindrait dès qu'on ouvre « Saisie ».
  const actif = chemin === entree.href || chemin.startsWith(`${entree.href}/`);
  const compteur = entree.compteur ? COMPTEURS[entree.compteur.cle] : 0;
  const enfantsVisibles = actif && !repliee && entree.enfants?.length;

  return (
    <>
      <Link
        href={entree.href}
        className="lien-nav"
        aria-current={actif ? "page" : undefined}
        title={repliee ? entree.libelle : undefined}
      >
        <span className="lien-nav__icone">
          <Icone nom={entree.icone} />
        </span>
        {!repliee && <span className="lien-nav__libelle">{entree.libelle}</span>}
        {entree.compteur && compteur > 0 && (
          <span
            className="lien-nav__pastille"
            data-ton={entree.compteur.ton}
            aria-label={`${compteur} en attente`}
          >
            {compteur}
          </span>
        )}
      </Link>

      {enfantsVisibles &&
        entree.enfants?.map((enfant) => (
          <Link
            key={enfant.href}
            href={enfant.href}
            className="lien-nav lien-nav--enfant"
            aria-current={chemin === enfant.href ? "page" : undefined}
          >
            <span className="lien-nav__libelle">{enfant.libelle}</span>
          </Link>
        ))}
    </>
  );
}
