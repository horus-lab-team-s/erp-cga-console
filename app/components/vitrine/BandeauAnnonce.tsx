"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { DUREE_ANNONCE_MS, type Annonce } from "@/app/lib/annonces";
import { Link, usePathname } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * L'annonce du cabinet, sur toutes les pages.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ELLE REVIENT À CHAQUE PAGE
 *
 * C'est la demande, et elle est plus subtile qu'il n'y paraît. Le site est une
 * application d'une seule page : en passant de l'accueil au blog, la coquille
 * n'est pas reconstruite, et ce composant n'est pas remonté. Sans traitement, le
 * bandeau disparu au bout de trente secondes ne reviendrait plus jamais de toute
 * la visite.
 *
 * Le chemin courant est donc **surveillé** : à chaque changement, le décompte
 * repart de zéro et le bandeau se réaffiche. Le visiteur revoit l'annonce en
 * changeant de page, exactement comme si chaque page était rechargée.
 *
 * ELLE S'EFFACE DEUX FOIS
 *
 * Au bout de trente secondes, et quand le visiteur la ferme. Une accroche qui
 * reste à demeure cesse d'être une accroche et devient un meuble qu'on contourne
 * du regard.
 *
 * ⚠️ La fermeture explicite, elle, ne revient pas d'une page à l'autre. C'est la
 * différence entre « je n'ai pas eu le temps de lire » et « je ne veux pas de
 * ça » : le décompte redémarre, la fermeture non. Elle est retenue en
 * `sessionStorage` pour toute la visite — mais pas au-delà, le cabinet ne perdant
 * pas son audience à la visite suivante.
 *
 * OÙ ELLE SE POSE
 *
 * En bas de la fenêtre, en position fixe, et non en tête de page. Un bandeau en
 * tête pousse l'en-tête et la bannière vers le bas, puis les fait remonter d'un
 * coup à sa disparition : le visiteur voit la page sauter sous ses yeux, et
 * parfois clique à côté. En bas, l'annonce se superpose à une zone où il n'y a
 * rien à cliquer, et sa disparition ne déplace aucun contenu.
 *
 * LE DÉCOMPTE SE SUSPEND
 *
 * Tant que le pointeur est sur le bandeau, ou que le clavier s'y trouve, la
 * minuterie est à l'arrêt. Retirer sous les doigts d'un visiteur le lien qu'il
 * s'apprêtait à cliquer serait plus perturbant que le bandeau lui-même. Elle
 * repart où elle en était dès qu'il s'écarte.
 *
 * D'OÙ VIENT L'ANNONCE
 *
 * Du backend, contexte L · Vitrine, lue par la coquille de la vitrine et passée
 * ici en propriété. Ce composant ne connaît ni l'adresse du backend, ni le
 * calendrier de validité : il reçoit une annonce ou rien, et se contente de
 * l'afficher correctement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Clé de mémorisation de la fermeture, préfixée pour ne rien écraser d'autre. */
const PREFIXE_FERMEE = "cga.annonce-fermee.";

/** La fermeture a-t-elle déjà été demandée pendant cette visite ? */
function dejaFermee(cle: string): boolean {
  try {
    return window.sessionStorage.getItem(`${PREFIXE_FERMEE}${cle}`) === "1";
  } catch {
    // Navigation privée, stockage interdit : on montre l'annonce. Mieux vaut la
    // revoir une fois de trop que la perdre pour tout le monde.
    return false;
  }
}

/**
 * « Sommes-nous chez le visiteur ? »
 *
 * Rien à surveiller, donc un abonnement inerte : la valeur ne change qu'une fois,
 * au passage du serveur au navigateur. Le serveur ignore ce que ce visiteur a
 * déjà fermé — rendre le bandeau d'emblée produirait un balisage que le
 * navigateur contredirait aussitôt.
 */
const abonnementInerte = () => () => {};
const cotéNavigateur = () => true;
const cotéServeur = () => false;

/**
 * Enveloppe : elle ne fait que remonter le bandeau à chaque changement de page.
 *
 * C'est **la clé** qui produit la réapparition demandée. Remonter le composant
 * remet tout son état à neuf — décompte compris — sans un seul effet de
 * remise à zéro. Un effet qui aurait remis les états à leur valeur initiale
 * aurait fait la même chose, en moins lisible et en plus fragile : c'est
 * exactement le cas où React préfère qu'on change la clé plutôt qu'on écrive un
 * effet.
 */
export function BandeauAnnonce({ annonce }: { annonce: Annonce | null }) {
  const chemin = usePathname();
  if (!annonce) return null;
  return <Bandeau key={chemin} annonce={annonce} />;
}

function Bandeau({ annonce }: { annonce: Annonce }) {
  const t = useTranslations("vitrine.annonce");
  const monte = useSyncExternalStore(abonnementInerte, cotéNavigateur, cotéServeur);

  const [ferme, setFerme] = useState(false);
  const [expire, setExpire] = useState(false);
  const [suspendu, setSuspendu] = useState(false);

  // La fermeture explicite, elle, traverse les pages : elle est relue à chaque
  // montage, donc à chaque navigation.
  const affiche = monte && !ferme && !expire && !dejaFermee(annonce.cle);

  // Ce qu'il reste à courir, et l'instant où le compte a repris. Deux valeurs de
  // travail dont le rendu ne dépend pas : des `ref`, pas des états.
  const restant = useRef(DUREE_ANNONCE_MS);
  const departi = useRef(0);
  const minuterie = useRef<number | null>(null);

  const fermer = useCallback(() => {
    setFerme(true);
    try {
      window.sessionStorage.setItem(`${PREFIXE_FERMEE}${annonce.cle}`, "1");
    } catch {
      // Stockage refusé : l'annonce reparaîtra à la page suivante. Désagrément,
      // pas panne.
    }
  }, [annonce]);

  // ── La minuterie, suspendue tant qu'on s'y attarde ───────────────────────
  useEffect(() => {
    if (!affiche) return;
    if (suspendu) {
      // On range ce qui reste, et on s'arrête là où on en était.
      if (minuterie.current !== null) {
        window.clearTimeout(minuterie.current);
        minuterie.current = null;
        restant.current = Math.max(0, restant.current - (Date.now() - departi.current));
      }
      return;
    }

    departi.current = Date.now();
    minuterie.current = window.setTimeout(() => setExpire(true), restant.current);
    return () => {
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
      minuterie.current = null;
    };
  }, [affiche, suspendu]);

  // ── Échap referme, comme partout ailleurs sur le site ────────────────────
  useEffect(() => {
    if (!affiche) return;
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") fermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [affiche, fermer]);

  if (!affiche) return null;

  return (
    <aside
      className="annonce"
      /* `status` et non `alert` : l'information est utile, elle n'est pas
         urgente. Un lecteur d'écran l'annonce quand il en a fini avec la phrase
         en cours, sans couper la lecture. */
      role="status"
      aria-live="polite"
      aria-label={t("region")}
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocusCapture={() => setSuspendu(true)}
      onBlurCapture={(evenement) => {
        // Le focus qui passe d'un bouton à l'autre **dans** le bandeau ne doit
        // pas relancer le décompte : on ne reprend que s'il en est sorti.
        if (!evenement.currentTarget.contains(evenement.relatedTarget as Node | null)) {
          setSuspendu(false);
        }
      }}
    >
      <div className="annonce__corps">
        <span className="annonce__etiquette">
          <IconeVitrine nom="megaphone" taille={14} />
          {annonce.etiquette}
        </span>

        <p className="annonce__texte">{annonce.texte}</p>

        <Link href={annonce.lien} className="annonce__action" onClick={fermer}>
          {annonce.libelleLien}
          <IconeVitrine nom="fleche" taille={15} />
        </Link>

        <button type="button" className="annonce__fermer" onClick={fermer} aria-label={t("fermer")}>
          <IconeVitrine nom="fermer" taille={16} />
        </button>
      </div>

      {/* La jauge dit **pourquoi** le bandeau va disparaître, et que ce n'est pas
          un caprice de la page. Purement décorative pour les technologies
          d'assistance, qui n'ont que faire d'une largeur qui bouge. Elle s'anime
          sur `transform`, donc sur le compositeur, et se fige avec le décompte
          qu'elle représente. */}
      <span className="annonce__jauge" aria-hidden="true">
        <span
          className="annonce__jauge-remplie"
          style={{
            animationDuration: `${DUREE_ANNONCE_MS}ms`,
            animationPlayState: suspendu ? "paused" : "running",
          }}
        />
      </span>
    </aside>
  );
}
