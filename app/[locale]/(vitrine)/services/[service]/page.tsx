import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { EtapesProgression } from "@/app/components/vitrine/EtapesProgression";
import { FormulaireService } from "@/app/components/vitrine/FormulaireService";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { FICHES_SERVICE, ficheParSlug, type FicheService } from "@/app/lib/services-vitrine";

/**
 * Fiche détaillée d'un service — `/services/<slug>`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE PAGE EXISTE
 *
 * Quatre entrées du méga-menu — prestations ponctuelles, domiciliation,
 * assistance juridique, conseil et audit — renvoyaient à la page Contact.
 * C'était une impasse : un visiteur qui clique sur « Domiciliation » veut savoir
 * ce que couvre la domiciliation, pas remplir un formulaire. On lui demandait de
 * s'engager avant de lui avoir dit ce qu'on vendait.
 *
 * UN SEUL GABARIT POUR QUATRE FICHES
 *
 * Les quatre répondent aux mêmes questions, dans le même ordre : qu'est-ce que
 * c'est, ce qui est compris, pour qui, comment ça se passe, combien. Écrire
 * quatre pages aurait garanti qu'elles divergent au premier ajout. Le contenu
 * vit donc dans les messages, sous `pages.fiches.<cle>`, et la mise en page est
 * ici — une seule fois.
 *
 * L'ORDRE DES SECTIONS EST L'ARGUMENTAIRE
 *
 * « Ce qui est compris » avant « pour qui » : le visiteur doit d'abord voir ce
 * qu'il achète. Le tarif en dernier, après la valeur — un montant lu avant ce
 * qu'il couvre paraît toujours cher.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function generateStaticParams() {
  return FICHES_SERVICE.map((fiche) => ({ service: fiche.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}): Promise<Metadata> {
  const { locale, service } = await params;
  const fiche = ficheParSlug(service);
  if (!fiche) return {};

  const t = await getTranslations({ locale, namespace: `pages.fiches.${fiche.cle}` });
  return {
    title: t("titre"),
    description: t("detail"),
    openGraph: {
      type: "website",
      title: t("titre"),
      description: t("detail"),
      images: [{ url: fiche.images[0], alt: t("titre") }],
    },
  };
}

export default async function PageFicheService({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service } = await params;
  setRequestLocale(locale);

  const fiche = ficheParSlug(service);
  if (!fiche) notFound();

  return (
    <>
      <Ouverture fiche={fiche} />
      <Prestations fiche={fiche} />
      <PourQui fiche={fiche} />
      <Deroulement fiche={fiche} />
      <Tarif fiche={fiche} />
      <Demande fiche={fiche} />
    </>
  );
}

function Ouverture({ fiche }: { fiche: FicheService }) {
  const t = useTranslations(`pages.fiches.${fiche.cle}`);
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      detailSurDeuxLignes
      images={[...fiche.images]}
      enfants={
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <a href="#demande" className="bouton bouton--principal heros__action">
            {t("action")}
            <IconeVitrine nom="fleche" taille={16} />
          </a>
        </div>
      }
    />
  );
}

/** Ce qui est compris. La première question, et celle qui décide. */
function Prestations({ fiche }: { fiche: FicheService }) {
  const t = useTranslations(`pages.fiches.${fiche.cle}`);
  const prestations = t.raw("prestations") as string[];

  return (
    <section className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("prestationsKicker")}</span>
        <h2 className="titre-section">{t("prestationsTitre")}</h2>

        <ul className="pile-centree formule__inclus" style={{ marginTop: 30 }}>
          {prestations.map((prestation) => (
            <li key={prestation}>
              <span className="formule__coche" aria-hidden="true">
                <IconeVitrine nom="exoneration" taille={15} />
              </span>
              {prestation}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** À qui le service s'adresse. Dit aussi, en creux, à qui il ne s'adresse pas. */
function PourQui({ fiche }: { fiche: FicheService }) {
  const t = useTranslations(`pages.fiches.${fiche.cle}`);
  const profils = t.raw("pourQui") as { titre: string; detail: string }[];

  return (
    <section className="section section--teinte section--centre">
      <div className="bloc">
        <span className="kicker">{t("pourQuiKicker")}</span>
        <h2 className="titre-section">{t("pourQuiTitre")}</h2>

        {/* `avantage--clair` : la carte d'origine est dessinée pour le fond
            indigo de l'accueil — texte blanc sur voile blanc translucide.
            Reprise telle quelle ici, sur fond clair, elle donnait du blanc sur
            blanc : le texte y était purement et simplement invisible. */}
        <div className="grille grille--3">
          {profils.map((profil) => (
            <article key={profil.titre} className="avantage avantage--clair">
              <span className="avantage__icone">
                <IconeVitrine nom={fiche.icone} taille={20} epaisseur={1.6} />
              </span>
              <h3 className="avantage__titre">{profil.titre}</h3>
              <p className="avantage__detail">{profil.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Comment ça se passe — même dispositif que l'accueil et l'adhésion. */
function Deroulement({ fiche }: { fiche: FicheService }) {
  const t = useTranslations(`pages.fiches.${fiche.cle}`);
  const etapes = t.raw("deroulement") as { titre: string; detail: string }[];

  return (
    <section className="section section--centre">
      <div className="bloc">
        <span className="kicker">{t("deroulementKicker")}</span>
        <h2 className="titre-section">{t("deroulementTitre")}</h2>
        <EtapesProgression etapes={etapes} />
      </div>
    </section>
  );
}

/**
 * Le tarif, en dernier.
 *
 * Après la valeur, jamais avant : un montant lu avant ce qu'il couvre paraît
 * toujours cher. Et il dit franchement ce qui reste à confirmer — un prix
 * annoncé qu'on révise ensuite coûte plus cher en confiance qu'il n'aura
 * rapporté en clics.
 */
function Tarif({ fiche }: { fiche: FicheService }) {
  const t = useTranslations(`pages.fiches.${fiche.cle}`);
  const commun = useTranslations("commun");

  return (
    <section className="section section--teinte section--centre">
      <div className="bloc bloc--etroit">
        <span className="kicker">{t("tarifKicker")}</span>
        <h2 className="titre-section">{t("tarifTitre")}</h2>
        <p className="chapeau chapeau--deux-lignes">{t("tarifDetail")}</p>

        <div className="article__appel" style={{ marginTop: 30 }}>
          <p>{t("tarifAppel")}</p>
          {/* Vers le formulaire de la **même page**, pas vers Contact : le
              visiteur vient de lire la fiche, il ne doit pas re-choisir dans une
              liste ce qu'il vient de passer trois minutes à comprendre. */}
          <a href="#demande" className="bouton bouton--principal bouton--large">
            {commun("actions.demanderDevis")}
            <IconeVitrine nom="fleche" taille={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Le formulaire, en bas de fiche, **pré-rempli sur le service lu**.
 *
 * C'est le passage à l'action qui manquait : la fiche expliquait bien, puis
 * renvoyait vers une page Contact générique où tout était à ressaisir.
 */
function Demande({ fiche }: { fiche: FicheService }) {
  const t = useTranslations(`pages.fiches.${fiche.cle}`);
  const commun = useTranslations("commun");

  return (
    <section className="section section--centre section--filigrane">
      <div className="bloc bloc--etroit">
        <FormulaireService
          sujetInitial={t("titre")}
          numeroWhatsapp={commun("cabinet.whatsapp").replace(/\D/g, "")}
        />
      </div>
    </section>
  );
}
