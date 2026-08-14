import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.cabinet" });
  return { title: t("titre"), description: t("detail") };
}

/**
 * Page « Le CGA » — maquette, section `surCabinet`.
 *
 * La page de confiance : elle répond à « à qui ai-je affaire ? ». Quatre
 * sections, chacune atteignable par une ancre publique visée depuis le pied de
 * page — `#histoire`, `#equipe`, `#agences`, `#partenaires`. Les renommer
 * casserait ces liens.
 *
 * 1. `Histoire` — les jalons datés. Une date vérifiable vaut dix adjectifs.
 * 2. `Equipe` — les visages et les rôles. Ce sont les mêmes personnes que celles
 *    qui signent les rubriques du blog : Aïcha, Owona, Kamdem.
 * 3. `Agences` — Douala, Yaoundé, Bafoussam, avec photographies. Un cabinet qu'on
 *    peut situer sur une carte est un cabinet qui existe.
 * 4. `Partenaires` — les familles de partenaires, en ruban défilant. Une bande en
 *    mouvement se lit au passage ; quatre encadrés figés se survolent sans être
 *    lus.
 *
 * ⚠️ Ne pas confondre cette section avec le ruban d'institutions de l'accueil
 * (`RubanPartenaires`) : celui-ci montre DGI, CNPS, ONECCA et OHADA, qui ne sont
 * pas des partenaires commerciaux mais le cadre légal du métier.
 */
export default async function LeCabinet({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Ouverture />
      <Histoire />
      <Equipe />
      <Agences />
      <Partenaires />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("pages.cabinet");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      images={["/images/pages/cabinet-a.jpg", "/images/pages/cabinet-b.jpg"]}
    />
  );
}

function Histoire() {
  const t = useTranslations("pages.cabinet");
  const jalons = t.raw("histoire") as { annee: string; titre: string; detail: string }[];
  return (
    <section id="histoire" className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("histoireKicker")}</span>
        <h2 className="titre-section">{t("histoireTitre")}</h2>
        <div className="frise">
          {jalons.map((jalon) => (
            <div key={jalon.annee} className="frise__etape">
              <span className="frise__annee">{jalon.annee}</span>
              <div>
                <h3
                  style={{
                    margin: 0,
                    font: "600 16.5px/1.35 var(--police-titre)",
                    color: "var(--ink-900)",
                  }}
                >
                  {jalon.titre}
                </h3>
                <p
                  style={{
                    margin: "6px 0 0",
                    font: "400 14px/1.65 var(--police-texte)",
                    color: "var(--ink-500)",
                  }}
                >
                  {jalon.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Equipe() {
  const t = useTranslations("pages.cabinet");
  const membres = t.raw("equipe") as {
    nom: string;
    role: string;
    detail: string;
    photo: string;
  }[];
  return (
    <section id="equipe" className="section section--teinte section--centre">
      <div className="bloc">
        <span className="kicker">{t("equipeKicker")}</span>
        <h2 className="titre-section">{t("equipeTitre")}</h2>

        <Direction />

        <div className="grille grille--3">
          {membres.map((membre) => (
            <article key={membre.nom} className="membre">
              <Image
                src={membre.photo}
                alt=""
                width={56}
                height={56}
                className="membre__portrait"
              />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    font: "600 15px/1.3 var(--police-titre)",
                    color: "var(--ink-900)",
                  }}
                >
                  {membre.nom}
                </span>
                <span
                  style={{
                    display: "block",
                    font: "600 12.5px/1.4 var(--police-texte)",
                    color: "var(--brand-magenta-600)",
                  }}
                >
                  {membre.role}
                </span>
                <span
                  style={{
                    display: "block",
                    font: "400 12.5px/1.5 var(--police-texte)",
                    color: "var(--ink-500)",
                  }}
                >
                  {membre.detail}
                </span>
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * La direction générale, mise en avant au-dessus de l'équipe.
 *
 * Une carte de la même grille que ses collaborateurs l'aurait noyée parmi eux.
 * Or c'est la personne qui engage le cabinet : sur un site de conseil, savoir
 * qui dirige compte autant que savoir ce qu'on vend.
 *
 * Le lien vers le site personnel s'ouvre dans un nouvel onglet — on ne fait pas
 * quitter la vitrine à un visiteur en cours de lecture — et porte
 * `rel="noopener"` comme tout lien sortant.
 */
function Direction() {
  const t = useTranslations("pages.cabinet.direction");
  return (
    <div className="direction">
      <div className="direction__portrait">
        <Image
          src="/images/equipe/Mme-paul-diane-himsta.png"
          alt={t("nom")}
          fill
          sizes="(max-width: 780px) 280px, 320px"
        />
      </div>
      <div className="direction__corps">
        <span className="direction__role">{t("role")}</span>
        <h3 className="direction__nom">{t("nom")}</h3>
        <p className="direction__detail">{t("detail")}</p>
        <a
          className="bouton bouton--secondaire"
          href="https://www.paule-diane-himsta.com/a-propos/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("siteWeb")}
          <IconeVitrine nom="fleche" taille={15} />
        </a>
      </div>
    </div>
  );
}

function Agences() {
  const t = useTranslations("pages.cabinet");
  const agences = t.raw("agences") as {
    ville: string;
    adresse: string;
    detail: string;
    photo: string;
  }[];
  return (
    <section id="agences" className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("agencesKicker")}</span>
        <h2 className="titre-section">{t("agencesTitre")}</h2>
        <div className="grille grille--3">
          {/* Même dispositif que les cartes de service de l'accueil : le corps
              est entaillé d'un demi-disque en tête, où vient se loger l'épingle
              ronde. La ville, l'adresse et la précision sont centrées dans la
              carte et hiérarchisées — ville, puis quartier en capitales, puis
              détail. Auparavant les trois lignes se suivaient au fer à gauche
              dans un même paragraphe, et l'adresse se confondait avec la note. */}
          {/* Même dispositif que les cartes de service de l'accueil : l'épingle
              chevauche le bord supérieur, moitié dehors, moitié dedans, et la
              carte est échancrée juste sous elle. La ville, le quartier et la
              précision sont centrés et hiérarchisés — ils se suivaient
              auparavant au fer à gauche dans un même paragraphe, où l'adresse se
              confondait avec la note. */}
          {agences.map((agence) => (
            <div key={agence.ville} className="carte-enveloppe">
              <span className="carte-enveloppe__icone">
                <IconeVitrine nom="lieu" taille={24} epaisseur={1.6} />
              </span>

              <article className="carte-creusee">
                <div className="carte-creusee__media">
                  <Image
                    src={agence.photo}
                    alt=""
                    fill
                    className="carte-creusee__photo"
                    sizes="(max-width: 980px) 100vw, 400px"
                  />
                </div>
                <div className="carte-creusee__corps">
                  <h3 className="carte-creusee__titre">{agence.ville}</h3>
                  <p className="carte-creusee__sous-titre">{agence.adresse}</p>
                  <p className="carte-creusee__detail">{agence.detail}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Partenaires() {
  const t = useTranslations("pages.cabinet");
  const partenaires = t.raw("partenaires") as { titre: string; detail: string }[];
  return (
    <section id="partenaires" className="section section--teinte section--centre">
      <div className="bloc">
        <span className="kicker">{t("partenairesKicker")}</span>
        <h2 className="titre-section">{t("partenairesTitre")}</h2>
        {/* Les quatre familles défilent, comme les témoignages de l'accueil :
            une bande en mouvement se lit au passage, quatre encadrés figés se
            survolent sans être lus. Rendue deux fois pour boucler sans saut. */}
        <div
          className="marque-ruban"
          style={{ ["--duree-defilement" as string]: "26s", marginTop: 30 }}
        >
          <div className="marque-ruban__piste">
            {[0, 1].map((copie) =>
              partenaires.map((partenaire) => (
                <article
                  key={`${copie}-${partenaire.titre}`}
                  className="partenaire-carte"
                  aria-hidden={copie === 1}
                >
                  <h3
                    style={{
                      margin: 0,
                      font: "600 15.5px/1.35 var(--police-titre)",
                      color: "var(--ink-900)",
                    }}
                  >
                    {partenaire.titre}
                  </h3>
                  <p
                    style={{
                      margin: "6px 0 0",
                      font: "400 13px/1.6 var(--police-texte)",
                      color: "var(--ink-500)",
                      textWrap: "pretty",
                    }}
                  >
                    {partenaire.detail}
                  </p>
                </article>
              )),
            )}
          </div>
        </div>
        <p className="chapeau chapeau--une-ligne">{t("partenairesNote")}</p>
      </div>
    </section>
  );
}
