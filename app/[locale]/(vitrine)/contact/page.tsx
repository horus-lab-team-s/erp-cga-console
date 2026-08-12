import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { FormulaireContact } from "@/app/components/vitrine/FormulaireContact";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contact" });
  return { title: t("titre"), description: t("detail") };
}

/**
 * Page « Contactez-nous » — maquette, section `surContact`.
 *
 * Trois sections, dans cet ordre et pas un autre :
 *
 * 1. `Ouverture` — la bannière réduite commune aux pages intérieures.
 * 2. `Canaux` — téléphone, WhatsApp, courriel, agences. **Avant** le formulaire,
 *    délibérément : au Cameroun, un prospect qui veut une réponse appelle ou
 *    écrit sur WhatsApp. Le formulaire est le recours de celui qui ne peut pas
 *    téléphoner, pas le chemin principal.
 * 3. `Formulaire` — la demande écrite, pour ce qui demande une pièce jointe ou
 *    une trace.
 *
 * Les coordonnées ne sont pas écrites ici : elles viennent de `commun.cabinet`,
 * seul endroit du dépôt où elles figurent. Un numéro qui change se corrige à un
 * seul endroit, et le pied de page comme la barre utilitaire suivent.
 */
export default async function Contact({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Ouverture />
      <Canaux />
      <Formulaire />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("pages.contact");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      images={["/images/pages/contact-a.jpg", "/images/pages/contact-b.jpg"]}
    />
  );
}

const ICONES = ["whatsapp", "telephone", "courriel"] as const;

function Canaux() {
  const t = useTranslations("pages.contact");
  const commun = useTranslations("commun");
  const canaux = t.raw("canaux") as {
    titre: string;
    valeur: string;
    detail: string;
    action: string;
  }[];
  const liens = [
    `https://wa.me/${commun("cabinet.whatsapp").replace(/\D/g, "")}`,
    `tel:${commun("cabinet.telephone").replace(/\s/g, "")}`,
    `mailto:${commun("cabinet.courriel")}`,
  ];

  return (
    <section className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("canauxKicker")}</span>
        <h2 className="titre-section">{t("canauxTitre")}</h2>
        <div className="grille grille--3">
          {canaux.map((canal, i) => (
            <a
              key={canal.titre}
              href={liens[i]}
              className="canal"
              target={i === 0 ? "_blank" : undefined}
              rel={i === 0 ? "noreferrer noopener" : undefined}
            >
              <span className="mega__icone">
                <IconeVitrine nom={ICONES[i]} epaisseur={1.6} />
              </span>
              <span
                style={{
                  font: "600 12px/1.4 var(--police-texte)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--ink-500)",
                }}
              >
                {canal.titre}
              </span>
              <span className="canal__valeur">{canal.valeur}</span>
              <span
                style={{ font: "400 13px/1.6 var(--police-texte)", color: "var(--ink-500)" }}
              >
                {canal.detail}
              </span>
              <span
                style={{
                  marginTop: "auto",
                  font: "600 13px/1 var(--police-texte)",
                  color: "var(--brand-indigo-700)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {canal.action}
                <IconeVitrine nom="fleche" taille={14} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Formulaire() {
  const t = useTranslations("pages.contact");
  return (
    <section className="section section--teinte section--centre section--filigrane">
      <div className="bloc" style={{ display: "grid", gap: 32, gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" }}>
        <div>
          <span className="kicker">{t("formulaireKicker")}</span>
          <h2 className="titre-section">{t("formulaireTitre")}</h2>
          <FormulaireContact />
        </div>

        <aside
          style={{
            alignSelf: "start",
            marginTop: 44,
            padding: 24,
            borderRadius: 14,
            background: "var(--brand-indigo-900)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0, font: "600 17px/1.35 var(--police-titre)", color: "#fff" }}>
            {t("dejaClient")}
          </h3>
          <p
            style={{
              margin: 0,
              font: "400 13.5px/1.7 var(--police-texte)",
              color: "rgb(255 255 255 / 76%)",
            }}
          >
            {t("dejaClientDetail")}
          </p>
          <Link href="/connexion" className="bouton bouton--clair bouton--large">
            {t("ouvrirEspace")}
            <IconeVitrine nom="connexion" taille={16} />
          </Link>
        </aside>
      </div>
    </section>
  );
}
