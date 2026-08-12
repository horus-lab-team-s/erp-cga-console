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
    <section id="equipe" className="section section--teinte section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("equipeKicker")}</span>
        <h2 className="titre-section">{t("equipeTitre")}</h2>
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
          {agences.map((agence) => (
            <article key={agence.ville} className="carte">
              <div className="carte__media">
                <Image
                  src={agence.photo}
                  alt=""
                  width={800}
                  height={420}
                  className="carte__image"
                  sizes="(max-width: 980px) 100vw, 400px"
                />
                <span className="carte__pastille">
                  <IconeVitrine nom="lieu" taille={20} epaisseur={1.6} />
                </span>
              </div>
              <div className="carte__corps">
                <h3 className="carte__titre">{agence.ville}</h3>
                <p className="carte__detail">
                  {agence.adresse}
                  <span style={{ display: "block" }}>{agence.detail}</span>
                </p>
              </div>
            </article>
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
    <section id="partenaires" className="section section--teinte section--centre section--filigrane">
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
