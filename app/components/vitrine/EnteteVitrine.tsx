"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { BasculeLangue } from "./BasculeLangue";
import { BasculeTheme } from "./BasculeTheme";

/** Les six entrées du § 6 de la maquette. `Estimation` reste hors menu : c'est une
 *  action, atteinte depuis la page Création ou depuis les appels du corps de page. */
const ENTREES = [
  { cle: "services", href: "/nos-services" },
  { cle: "adherent", href: "/devenir-adherent" },
  { cle: "formations", href: "/formations" },
  { cle: "cabinet", href: "/le-cabinet" },
  { cle: "contact", href: "/contact" },
] as const;

export function EnteteVitrine() {
  const t = useTranslations("vitrine.nav");
  const commun = useTranslations("commun");
  const chemin = usePathname();
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  // Le corps ne défile plus derrière le tiroir : sans cela, refermer le menu
  // ramène le lecteur à un autre endroit de la page que celui qu'il avait quitté.
  useEffect(() => {
    if (!tiroirOuvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTiroirOuvert(false);
    };
    document.addEventListener("keydown", auClavier);
    return () => {
      document.body.style.overflow = precedent;
      document.removeEventListener("keydown", auClavier);
    };
  }, [tiroirOuvert]);

  return (
    <header className="entete-vitrine">
      <div className="bloc entete-vitrine__barre">
        <Link href="/" className="entete-vitrine__marque">
          <Image
            src="/marque/cga-logo-couleur.jpg"
            alt=""
            width={46}
            height={46}
            priority
            style={{ borderRadius: 8, objectFit: "contain" }}
          />
          <span>
            <span className="entete-vitrine__nom">{commun("cabinet.nomCourt")}</span>
            <span className="entete-vitrine__signature">{commun("cabinet.signature")}</span>
          </span>
        </Link>

        <nav className="nav-vitrine" aria-label={commun("actions.ouvrirMenu")}>
          {ENTREES.map((entree) => (
            <Link
              key={entree.cle}
              href={entree.href}
              className="nav-vitrine__lien"
              aria-current={chemin === entree.href ? "page" : undefined}
            >
              {t(entree.cle)}
            </Link>
          ))}
        </nav>

        <div className="entete-vitrine__outils">
          <BasculeLangue />
          <BasculeTheme />
          <Link href="/connexion" className="bouton bouton--principal" style={{ minHeight: 38 }}>
            {commun("actions.espaceClient")}
          </Link>
          <button
            type="button"
            className="bouton-icone entete-vitrine__menu"
            onClick={() => setTiroirOuvert(true)}
            aria-label={commun("actions.ouvrirMenu")}
            aria-expanded={tiroirOuvert}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {tiroirOuvert && (
        <div
          className="tiroir"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTiroirOuvert(false);
          }}
        >
          {/* Un menu resté ouvert après navigation masquerait la page qu'on vient
              d'ouvrir. On ferme au clic sur un lien plutôt que dans un effet
              observant le chemin : l'effet provoquerait un rendu supplémentaire à
              chaque navigation, y compris quand le tiroir est déjà fermé. */}
          <div
            className="tiroir__panneau"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setTiroirOuvert(false);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <span style={{ font: "600 15px/1 var(--police-titre)", color: "var(--ink-900)" }}>
                {commun("cabinet.nomCourt")}
              </span>
              <button
                type="button"
                className="bouton-icone"
                style={{ marginLeft: "auto" }}
                onClick={() => setTiroirOuvert(false)}
                aria-label={commun("actions.fermerMenu")}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {ENTREES.map((entree) => (
              <Link
                key={entree.cle}
                href={entree.href}
                className="tiroir__lien"
                aria-current={chemin === entree.href ? "page" : undefined}
              >
                {t(entree.cle)}
              </Link>
            ))}

            <Link
              href="/connexion"
              className="bouton bouton--principal"
              style={{ marginTop: 12, minHeight: 52 }}
            >
              {commun("actions.espaceClient")}
            </Link>
            <a
              href={`tel:${commun("cabinet.telephone").replace(/\s/g, "")}`}
              className="bouton bouton--secondaire"
              style={{ minHeight: 52 }}
            >
              {commun("cabinet.telephone")}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
