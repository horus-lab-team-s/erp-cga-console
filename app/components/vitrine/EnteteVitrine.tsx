"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { basculerTheme, lireTheme, souscrireTheme, themeParDefaut } from "@/app/lib/preferences";
import {
  ENTREES_NAV,
  FORMES_JURIDIQUES,
  SERVICES_VITRINE,
  lienForme,
} from "@/app/lib/services-vitrine";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LANGUES } from "@/i18n/routing";
import { IconeVitrine } from "./IconeVitrine";

/**
 * En-tête du site vitrine — repris des maquettes `Site vitrine CGA` et
 * `Vitrine mobile CGA`.
 *
 * Trois étages, dans cet ordre :
 *
 * 1. une **barre utilitaire** de 38 px : téléphone, courriel, agrément ;
 * 2. une **pilule flottante** de 72 px, centrée, posée en superposition du
 *    héros — d'où le `position: absolute` du conteneur ;
 * 3. un **méga-menu** déroulant sous « Nos services ».
 *
 * En dessous de 980 px, la pilule se réduit et le menu passe en tiroir à deux
 * niveaux, comme la maquette mobile.
 *
 * Le repère de position n'apparaît que sur l'entrée courante. Il n'y a plus de
 * pastille grise par défaut : un point sur chaque entrée ne repère rien, il
 * décore. Ce qui se voit doit vouloir dire quelque chose.
 */

/**
 * Délai de grâce avant fermeture du méga-menu, en millisecondes.
 *
 * En descendant vers le panneau, la souris coupe l'angle et sort brièvement de
 * la zone. Sans ce délai, le menu se referme au nez du visiteur.
 */
const GRACE_FERMETURE = 180;
export function EnteteVitrine() {
  const t = useTranslations("vitrine.nav");
  const mega = useTranslations("vitrine.megaMenu");
  const services = useTranslations("vitrine.services");
  const commun = useTranslations("commun");
  const chemin = usePathname();
  const routeur = useRouter();
  const langue = useLocale();

  const [megaOuvert, setMegaOuvert] = useState(false);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const [niveauServices, setNiveauServices] = useState(false);
  const zoneMega = useRef<HTMLDivElement>(null);
  const boutonServices = useRef<HTMLButtonElement>(null);
  const minuterieFermeture = useRef<number | null>(null);

  function annulerFermeture() {
    if (minuterieFermeture.current === null) return;
    window.clearTimeout(minuterieFermeture.current);
    minuterieFermeture.current = null;
  }

  function ouvrirMega() {
    annulerFermeture();
    setMegaOuvert(true);
  }

  /** Fermeture différée : voir `GRACE_FERMETURE`. */
  function fermerMegaBientot() {
    annulerFermeture();
    minuterieFermeture.current = window.setTimeout(
      () => setMegaOuvert(false),
      GRACE_FERMETURE,
    );
  }

  const theme = useSyncExternalStore(souscrireTheme, lireTheme, themeParDefaut);
  const versSombre = theme === "clair";

  useEffect(() => {
    if (!megaOuvert && !tiroirOuvert) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Le focus revient au déclencheur : refermer un menu au clavier ne doit
      // pas renvoyer le visiteur en haut du document.
      if (megaOuvert) boutonServices.current?.focus();
      setMegaOuvert(false);
      setTiroirOuvert(false);
      setNiveauServices(false);
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [megaOuvert, tiroirOuvert]);

  // Un clic ailleurs referme le panneau. Le survol ne suffit pas : au doigt et
  // au clavier, il n'y a pas de survol.
  useEffect(() => {
    if (!megaOuvert) return;
    const auClic = (e: MouseEvent) => {
      if (zoneMega.current?.contains(e.target as Node)) return;
      setMegaOuvert(false);
    };
    document.addEventListener("pointerdown", auClic);
    return () => document.removeEventListener("pointerdown", auClic);
  }, [megaOuvert]);

  // La minuterie de grâce ne doit pas survivre au démontage.
  useEffect(() => annulerFermeture, []);

  // Le corps ne défile plus derrière le tiroir : sans cela, refermer le menu
  // ramène le lecteur à un autre endroit de la page que celui qu'il a quitté.
  useEffect(() => {
    if (!tiroirOuvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [tiroirOuvert]);

  function fermerTout() {
    setTiroirOuvert(false);
    setNiveauServices(false);
    setMegaOuvert(false);
  }

  return (
    <header className="entete-vitrine">
      {/* ── 1 · Barre utilitaire ─────────────────────────────────────── */}
      <div className="barre-utile">
        <a
          className="barre-utile__element"
          href={`tel:${commun("cabinet.telephone").replace(/\s/g, "")}`}
        >
          <IconeVitrine nom="telephone" taille={14} />
          {commun("cabinet.telephone")}
        </a>
        <a
          className="barre-utile__element barre-utile__element--courriel"
          href={`mailto:${commun("cabinet.courriel")}`}
        >
          <IconeVitrine nom="courriel" taille={14} />
          {commun("cabinet.courriel")}
        </a>
        <span className="barre-utile__agrement">
          <IconeVitrine nom="bouclier" taille={14} />
          {commun("cabinet.agrement")}
        </span>
      </div>

      {/* ── 2 · Pilule de navigation ─────────────────────────────────── */}
      <div ref={zoneMega} onMouseLeave={fermerMegaBientot} onMouseEnter={annulerFermeture} style={{ position: "relative" }}>
        <div className="entete-vitrine__rangee">
          <div className="pilule">
            <Link href="/" className="pilule__logo" title={commun("actions.retourAccueil")}>
              {/* Deux fichiers distincts, comme au dessin : le logo couleur sur
                  fond clair, le monochrome blanc sur fond sombre. Le blanc est un
                  vrai tracé sur transparent — pas le logo couleur posé sur un
                  rectangle blanc, qui ferait une tache dans la barre sombre. */}
              <Image
                src={
                  theme === "sombre"
                    ? "/marque/cga-logo-blanc.png"
                    : "/marque/cga-logo-couleur.jpg"
                }
                alt={commun("cabinet.nom")}
                width={112}
                height={63}
                priority
                style={{ width: 112, height: "auto" }}
              />
            </Link>

            <nav className="nav-vitrine" aria-label={commun("actions.ouvrirMenu")}>
              {ENTREES_NAV.map((entree) => {
                const courante = chemin === entree.href;
                /* Le repère n'existe que sur l'entrée courante : rien à voir
                   ailleurs, donc rien à rendre. */
                const repere = courante ? (
                  <span className="nav-vitrine__repere" aria-hidden="true" />
                ) : null;

                return entree.megaMenu ? (
                  <button
                    key={entree.cle}
                    ref={boutonServices}
                    type="button"
                    className="nav-vitrine__lien"
                    aria-current={courante ? "page" : undefined}
                    aria-expanded={megaOuvert}
                    aria-haspopup="true"
                    onMouseEnter={ouvrirMega}
                    onFocus={ouvrirMega}
                    /* Un bouton qui annonce `aria-haspopup` doit ouvrir le
                       panneau, pas naviguer : le clic le bascule. La page
                       « Nos services » reste atteignable depuis les fiches. */
                    onClick={() => setMegaOuvert((ouvert) => !ouvert)}
                  >
                    {t(entree.cle)}
                    <IconeVitrine nom="chevronBas" taille={15} epaisseur={1.8} />
                    {repere}
                  </button>
                ) : (
                  <Link
                    key={entree.cle}
                    href={entree.href}
                    className="nav-vitrine__lien"
                    aria-current={courante ? "page" : undefined}
                    onMouseEnter={fermerMegaBientot}
                  >
                    {t(entree.cle)}
                    {repere}
                  </Link>
                );
              })}
            </nav>

            <div className="pilule__outils">
              <select
                className="select-langue"
                aria-label={commun("langue.choisir")}
                value={langue}
                onChange={(e) => routeur.replace(chemin, { locale: e.target.value as "fr" | "en" })}
              >
                {LANGUES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.drapeau} {l.libelle}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="bouton-icone"
                onClick={basculerTheme}
                aria-label={versSombre ? commun("theme.sombre") : commun("theme.clair")}
                title={versSombre ? commun("theme.sombre") : commun("theme.clair")}
              >
                <IconeVitrine nom={versSombre ? "lune" : "soleil"} />
              </button>

              <Link
                href="/connexion"
                className="bouton bouton--secondaire pilule__espace-client"
              >
                <IconeVitrine nom="connexion" taille={16} />
                {commun("actions.espaceClient")}
              </Link>

              <Link href="/contact" className="bouton bouton--principal">
                <IconeVitrine nom="whatsapp" taille={16} />
                {commun("actions.nousJoindre")}
              </Link>

              <button
                type="button"
                className="bouton-icone pilule__menu"
                onClick={() => setTiroirOuvert(true)}
                aria-label={commun("actions.ouvrirMenu")}
                aria-expanded={tiroirOuvert}
              >
                <IconeVitrine nom="menu" taille={20} />
              </button>
            </div>
          </div>
        </div>

        {/* ── 3 · Méga-menu ──────────────────────────────────────────── */}
        {megaOuvert && (
          <div className="mega" onMouseEnter={annulerFermeture}>
            <div className="mega__grille">
              {SERVICES_VITRINE.map((service) => (
                <Link
                  key={service.cle}
                  href={service.href}
                  className={`mega__carte${service.accent ? " mega__carte--accent" : ""}`}
                  onClick={() => setMegaOuvert(false)}
                >
                  <span className="mega__icone">
                    <IconeVitrine nom={service.icone} epaisseur={1.6} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="mega__titre">{services(`${service.cle}.titre`)}</span>
                    <span className="mega__detail">{services(`${service.cle}.detail`)}</span>
                    <span className="mega__prix">{services(`${service.cle}.prix`)}</span>
                  </span>
                </Link>
              ))}
            </div>

            {/* Colonne des formes juridiques : le visiteur qui vient créer sait
                déjà quelle société il veut, il ne veut pas relire les six
                services pour la trouver. */}
            <div className="mega__formes">
              <p className="mega__formes-titre">{mega("creerTitre")}</p>
              <ul className="mega__formes-liste">
                {FORMES_JURIDIQUES.map((forme) => (
                  <li key={forme.cle}>
                    <Link href={lienForme(forme)} onClick={() => setMegaOuvert(false)}>
                      {mega(`formes.${forme.cle}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mega__aparte">
              <p style={{ margin: 0, font: "600 16px/1.35 var(--police-titre)", color: "#fff" }}>
                {mega("hesitez")}
              </p>
              <p
                style={{
                  margin: 0,
                  font: "400 12.5px/1.7 var(--police-texte)",
                  color: "rgb(255 255 255 / 75%)",
                  textWrap: "pretty",
                }}
              >
                {mega("hesitezDetail")}
              </p>
              <Link
                href="/estimation"
                className="bouton bouton--principal bouton--large"
                style={{ marginTop: "auto" }}
                onClick={() => setMegaOuvert(false)}
              >
                {commun("actions.estimerProjet")}
              </Link>
              <Link
                href="/contact"
                className="bouton bouton--clair bouton--large"
                onClick={() => setMegaOuvert(false)}
              >
                {commun("actions.etreRappele")}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Tiroir mobile, à deux niveaux ────────────────────────────── */}
      {tiroirOuvert && (
        <div
          className="tiroir"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) fermerTout();
          }}
        >
          {/* On ferme au clic sur un lien plutôt que dans un effet observant le
              chemin : l'effet provoquerait un rendu supplémentaire à chaque
              navigation, y compris quand le tiroir est déjà fermé. */}
          <div
            className="tiroir__panneau"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) fermerTout();
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {niveauServices ? (
                <button
                  type="button"
                  className="bouton-icone"
                  onClick={() => setNiveauServices(false)}
                  aria-label={commun("actions.precedent")}
                >
                  <IconeVitrine nom="retour" />
                </button>
              ) : (
                <Image
                  src={
                    theme === "sombre"
                      ? "/marque/cga-logo-blanc.png"
                      : "/marque/cga-logo-couleur.jpg"
                  }
                  alt=""
                  width={88}
                  height={50}
                  style={{ width: 88, height: "auto" }}
                />
              )}
              <span
                style={{
                  font: "600 15px/1 var(--police-titre)",
                  color: "var(--ink-900)",
                  marginLeft: niveauServices ? 0 : "auto",
                }}
              >
                {niveauServices ? t("services") : ""}
              </span>
              <button
                type="button"
                className="bouton-icone"
                style={{ marginLeft: "auto" }}
                onClick={fermerTout}
                aria-label={commun("actions.fermerMenu")}
              >
                <IconeVitrine nom="fermer" />
              </button>
            </div>

            {niveauServices ? (
              <>
                {SERVICES_VITRINE.map((service) => (
                  <Link key={service.cle} href={service.href} className="tiroir__lien">
                    <span className="mega__icone" style={{ width: 32, height: 32 }}>
                      <IconeVitrine nom={service.icone} taille={16} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block" }}>{services(`${service.cle}.titre`)}</span>
                      <span
                        style={{
                          display: "block",
                          font: "600 11.5px/1.4 var(--police-texte)",
                          color: "var(--brand-magenta-600)",
                        }}
                      >
                        {services(`${service.cle}.prix`)}
                      </span>
                    </span>
                  </Link>
                ))}

                {/* Mêmes raccourcis qu'au méga-menu : au doigt aussi, celui qui
                    sait quelle société il veut doit y aller directement. */}
                <p className="mega__formes-titre" style={{ marginTop: 16 }}>
                  {mega("creerTitre")}
                </p>
                <div className="tiroir__formes">
                  {FORMES_JURIDIQUES.map((forme) => (
                    <Link key={forme.cle} href={lienForme(forme)} className="tiroir__forme">
                      {mega(`formes.${forme.cle}`)}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <>
                {ENTREES_NAV.map((entree) =>
                  entree.megaMenu ? (
                    <button
                      key={entree.cle}
                      type="button"
                      className="tiroir__lien"
                      onClick={() => setNiveauServices(true)}
                      aria-expanded={niveauServices}
                    >
                      {t(entree.cle)}
                      <span className="tiroir__chevron">
                        <IconeVitrine nom="fleche" taille={16} />
                      </span>
                    </button>
                  ) : (
                    <Link
                      key={entree.cle}
                      href={entree.href}
                      className="tiroir__lien"
                      aria-current={chemin === entree.href ? "page" : undefined}
                    >
                      {t(entree.cle)}
                    </Link>
                  ),
                )}

                <Link
                  href="/connexion"
                  className="bouton bouton--secondaire bouton--large"
                  style={{ marginTop: 12, minHeight: 52 }}
                >
                  <IconeVitrine nom="connexion" taille={16} />
                  {commun("actions.espaceClient")}
                </Link>
                <a
                  href={`tel:${commun("cabinet.telephone").replace(/\s/g, "")}`}
                  className="bouton bouton--principal bouton--large"
                  style={{ minHeight: 52 }}
                >
                  <IconeVitrine nom="telephone" taille={16} />
                  {commun("cabinet.telephone")}
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
