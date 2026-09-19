"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ADRESSE_VITRINE } from "@/app/lib/adresse-vitrine";

/**
 * L'en-tête des pages publiques de la console : connexion, activation, oubli.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI IL REMPLACE L'EN-TÊTE DE LA VITRINE
 *
 * Ces pages portaient la navigation complète du site public : « Nos services »,
 * « Formations », « Blog », « Contactez-nous »… Du temps du monodépôt, une seule
 * application servait les deux, et ces liens menaient quelque part.
 *
 * Après la scission, ils mènent tous à un 404 — vérifié, les sept. Et leurs
 * libellés ne s'affichaient même pas : le catalogue `vitrine.json` est resté
 * dans l'autre dépôt, si bien que la barre annonçait « vitrine.nav.services »,
 * « vitrine.nav.blog », en toutes lettres, à qui vient taper son mot de passe.
 *
 * Deux défauts d'un coup, et aucun ne se voit autrement qu'en OUVRANT la page :
 * les types passent, la compilation passe, la couverture des écrans passe.
 *
 * Ce qu'il faut ici est d'ailleurs plus sobre : quelqu'un qui vient s'identifier
 * n'a pas besoin d'un menu. Le logo, pour savoir où l'on est, et une porte de
 * sortie vers le site public, qui est maintenant ailleurs — donc une adresse
 * absolue, réglable au déploiement.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EnteteConsole() {
  const commun = useTranslations("commun");

  return (
    <header className="entete-console">
      <div className="entete-console__dedans">
        <Link href="/connexion" className="entete-console__marque">
          <Image
            src="/marque/cga-logo-couleur.jpg"
            alt={commun("cabinet.nom")}
            width={144}
            height={81}
            priority
          />
        </Link>

        {/* ⚠️ Une ancre ordinaire, et non le `Link` internationalisé : la
            vitrine est une AUTRE application, souvent un autre domaine. Un
            `Link` y ajouterait le préfixe de langue de la console et
            produirait une adresse qui n'existe pas là-bas. */}
        <a className="entete-console__retour" href={ADRESSE_VITRINE}>
          ← {commun("actions.retourAuSite")}
        </a>
      </div>
    </header>
  );
}
