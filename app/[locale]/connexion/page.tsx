import Image from "next/image";

import { ADRESSE_VITRINE } from "@/app/lib/adresse-vitrine";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { FormulaireConnexion } from "@/app/components/vitrine/FormulaireConnexion";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import "@/app/styles/vitrine.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.connexion" });
  return { title: t("titre"), description: t("detail") };
}

/**
 * Page de connexion — maquette, section `surConnexion`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ELLE PORTE L'EN-TÊTE ET LE PIED DU SITE
 *
 * Décision du 13 août 2026, qui **renverse** le choix initial. La page vivait
 * auparavant sans navigation ni pied, au motif qu'une page de connexion offrant
 * dix autres chemins détourne de la seule action attendue. Le raisonnement
 * valait pour la concentration, mais il coûtait plus cher ailleurs : dépouillée
 * de tout repère, la page donnait au visiteur le sentiment d'avoir **quitté le
 * site** pour un service tiers — exactement l'inquiétude qu'on ne veut pas
 * susciter au moment de saisir un identifiant.
 *
 * L'en-tête et le pied sont donc rendus ici, à la main, plutôt que par le
 * gabarit `(vitrine)` : la page garde sa mise en page plein écran et son fond
 * photographique, tout en montrant qu'elle fait partie du même ensemble.
 *
 * Le groupe de routes reste distinct de `(vitrine)` pour une raison qui n'a pas
 * changé : cette page ne porte ni bandeau d'appel, ni annonce. On ne relance pas
 * commercialement quelqu'un qui est en train de se connecter.
 *
 * Point d'entrée unique pour les quatre populations. Le routage vers le bon
 * espace se fait APRÈS authentification, selon le profil — il n'y a donc rien à
 * choisir ici.
 *
 * ⚠️ Le formulaire n'authentifie pas : voir l'avertissement en tête de
 * `FormulaireConnexion`. Le contexte K · Transverse, qui portera l'identité et
 * les rôles, n'est pas implémenté.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Connexion({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    // ⚠️ NI EN-TÊTE NI PIED, et c'est le dessin d'origine : voir le commentaire
    // de `Ecran`. Cette page est volontairement un cul-de-sac, avec sa propre
    // marque et sa propre porte de sortie. La coquille de la vitrine y avait été
    // posée du temps où une seule application servait les deux ; après la
    // scission elle affichait sept liens qui rendaient tous 404, sous des
    // libellés qui ne se chargeaient plus.
    <div className="vitrine">
      <Ecran />
    </div>
  );
}

function Ecran() {
  const t = useTranslations("pages.connexion");
  const commun = useTranslations("commun");
  const profils = t.raw("profils") as { titre: string; detail: string }[];

  const etiquette: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    font: "600 11px/1.7 var(--police-texte)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgb(255 255 255 / 60%)",
  };

  return (
    <main
      style={{
        position: "relative",
        /* ⚠️ PLUS DE RÉSERVE DE 126 px EN TÊTE. Elle existait pour l'en-tête
           fixe de la vitrine, qui ne coiffe plus cette page depuis qu'elle a
           retrouvé son dessin de cul-de-sac. Cent vingt-six pixels de vide
           poussaient le formulaire vers le bas sans qu'aucun en-tête n'occupe
           la place. */
        minHeight: "100vh",
        paddingTop: 48,
        paddingBottom: 48,
        /* L'indigo de l'institution, à plat. Voir plus bas pourquoi il n'y a
           plus de photographie. */
        background: "var(--brand-indigo-900)",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* ⚠️ LA PHOTOGRAPHIE EST PARTIE, ET C'EST LA RÈGLE QUI LE DEMANDE.
          Le § 10.7 du dossier de design, dérogation du 10 août 2026 : « la
          photographie est admise sur la vitrine, PROSCRITE DANS L'ESPACE DE
          TRAVAIL ». Cette page en est la porte.

          Et la mesure disait la même chose : l'image couvrait 130 % de la
          hauteur de l'écran, poussait le formulaire 245 px sous la ligne de
          flottaison, et obligeait à faire défiler pour atteindre le bouton. Le
          texte posé dessus changeait de lisibilité selon qu'une chemise claire
          ou un mur sombre passait derrière.

          Un aplat d'indigo ne décore rien. Il n'en a pas besoin : ce qu'on
          vient faire ici tient en deux champs. */}
      <div
        className="bloc connexion__grille"
        style={{ position: "relative", zIndex: 2, alignItems: "center" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Retour à la vitrine, en bouton visible et non en lien discret.
              Cette page est un cul-de-sac : ni en-tête du site, ni pied, ni menu.
              Le visiteur qui renonce à se connecter n'a que le bouton
              « précédent » du navigateur — lequel ne mène nulle part s'il est
              arrivé par un lien direct. Le logo ramenait déjà à l'accueil, mais
              rien ne le disait : un logo cliquable est une convention, pas une
              indication. */}
          {/* ⚠️ Une ancre vers une ADRESSE ABSOLUE, et non un lien interne.
              « / » menait à l'accueil du site public du temps où c'était la
              même application. Depuis la scission, « / » de la console renvoie
              à la connexion : le bouton de sortie ramenait sur la page qu'on
              voulait quitter. Une boucle, sur le seul geste offert à qui
              renonce. */}
          <a href={ADRESSE_VITRINE} className="retour-vitrine">
            <IconeVitrine nom="retour" taille={15} />
            {commun("actions.retourVitrine")}
          </a>

          <a href={ADRESSE_VITRINE} style={{ alignSelf: "flex-start" }}>
            <Image
              src="/marque/cga-logo-blanc.png"
              alt={commun("cabinet.nom")}
              width={132}
              height={74}
              priority
              style={{ width: 132, height: "auto" }}
            />
          </a>
          <span className="heros__kicker">{t("kicker")}</span>
          <h1 className="heros__titre">{t("titre")}</h1>
          <p className="heros__detail">{t("detail")}</p>

          {/* ─────────────────────────────────────────────────────────────
              ⚠️ CE QU'ON VIENT Y FAIRE, ET NON QUI PEUT Y ENTRER.

              Ces quatre cartes décrivaient les quatre POPULATIONS admises :
              cabinet, entreprise cliente, souscripteur, plateforme. C'est
              l'organigramme du système, pas sa raison d'être, et l'adhérent qui
              arrive sur cette page n'a que faire de savoir que le fiscaliste
              entre par la même porte.

              Le produit existe pour qu'un membre suive sa fiscalité, sa DSF et
              ses règlements SELON SA FORMULE d'adhésion. C'est cela que la porte
              doit annoncer.

              ⚠️ CHAQUE CARTE NE PROMET QUE CE QUI EXISTE, et cela a été vérifié
              ligne à ligne sur le serveur avant d'être écrit :
              · les échéances : six obligations réelles, CNPS, TVA, acomptes,
                patente et DSF, avec leur date et le coût du retard ;
              · la DSF : un code d'obligation à part entière, échéance au
                16 mars ;
              · les règlements : la route « j'ai déjà payé, voici la preuve »
                existe. **Le paiement en ligne, lui, n'existe pas** : la carte
                dit donc « réglez, puis envoyez la quittance », et jamais
                « payez ici ». Écrire l'inverse serait promettre sur la porte ce
                qu'on ne tient pas à l'intérieur ;
              · la formule : impôt libératoire, réel simplifié ou réel, ce sont
                les trois régimes du catalogue de l'offre.
              ───────────────────────────────────────────────────────────── */}
          <div style={{ marginTop: 18 }}>
            <span style={etiquette}>{t("profilsTitre")}</span>
            <div className="grille grille--2" style={{ marginTop: 12, gap: 12 }}>
              {profils.map((profil) => (
                <div
                  key={profil.titre}
                  className="avantage avantage--sur-sombre"
                  style={{ padding: 16, gap: 6 }}
                >
                  <h2 className="avantage__titre" style={{ fontSize: 14.5 }}>
                    {profil.titre}
                  </h2>
                  <p className="avantage__detail" style={{ fontSize: 12.5 }}>
                    {profil.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Les quatre populations ne disparaissent pas : elles descendent au
              rang de précision. C'est une information utile — on ne sait pas
              toujours par où l'on entre — mais elle ne mérite pas la moitié de
              la page. */}
          <p
            style={{
              marginTop: 18,
              font: "400 12.5px/1.6 var(--police-texte)",
              color: "rgb(255 255 255 / 72%)",
            }}
          >
            <strong style={{ color: "#fff", fontWeight: 600 }}>
              {t("portesTitre")}
            </strong>{" "}
            · {t("portes")}
          </p>
        </div>

        <FormulaireConnexion />
      </div>
    </main>
  );
}
