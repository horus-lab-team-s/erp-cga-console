import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { FormulaireService } from "@/app/components/vitrine/FormulaireService";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.formations" });
  return { title: t("titre"), description: t("detail") };
}

/**
 * Page « Formations » — maquette, section `surFormations`.
 *
 * Le catalogue des sessions, chacune avec sa date, sa durée, son public, son
 * programme et son prix. Le programme est affiché en entier plutôt que résumé :
 * une formation professionnelle s'achète sur son contenu, et un intitulé seul
 * n'engage personne à réserver.
 *
 * Les sessions viennent des messages (`pages.formations.catalogue`) et non d'une
 * source de données : le calendrier est refait chaque trimestre par le cabinet,
 * et il est bilingue. Le jour où il changera plusieurs fois par mois, il ira
 * rejoindre le contenu éditorial du contexte L · Vitrine.
 *
 * Le bloc « sur mesure », en bas, existe parce que la moitié des demandes reçues
 * ne correspondent à aucune session du catalogue.
 */
export default async function Formations({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /* La session choisie voyage dans l'adresse plutôt que dans un état client.
     Trois avantages : « Réserver une place » reste un simple lien, la page
     demeure rendue par le serveur, et l'inscription à une session précise
     s'envoie par message telle quelle. */
  const { service } = await searchParams;

  return (
    <>
      <Ouverture />
      <Catalogue />
      <Demande sessionChoisie={service} />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("pages.formations");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      images={["/images/pages/formations-a.jpg", "/images/pages/formations-b.jpg"]}
    />
  );
}

type Session = {
  titre: string;
  duree: string;
  public: string;
  prix: string;
  places: string;
  date: string;
  programme: string[];
};

function Catalogue() {
  const t = useTranslations("pages.formations");
  const commun = useTranslations("commun");
  const sessions = t.raw("catalogue") as Session[];

  return (
    <section className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("calendrierKicker")}</span>
        <h2 className="titre-section">{t("calendrierTitre")}</h2>

        <div className="grille grille--2">
          {sessions.map((session) => (
            <article key={session.titre} className="formule">
              <h3
                style={{
                  margin: 0,
                  font: "600 18px/1.3 var(--police-titre)",
                  color: "var(--ink-900)",
                }}
              >
                {session.titre}
              </h3>
              <p
                className="tabulaire"
                style={{
                  margin: 0,
                  font: "400 12.5px/1.6 var(--police-texte)",
                  color: "var(--ink-500)",
                }}
              >
                {session.date} · {session.duree} · {session.places}
                <span style={{ display: "block" }}>{session.public}</span>
              </p>

              <div>
                <span
                  style={{
                    display: "block",
                    marginBottom: 6,
                    font: "600 11.5px/1.4 var(--police-texte)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--ink-500)",
                  }}
                >
                  {t("programme")}
                </span>
                <ul className="formule__inclus">
                  {session.programme.map((point) => (
                    <li key={point}>
                      <span className="formule__coche" aria-hidden="true">
                        <IconeVitrine nom="exoneration" taille={15} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className="formule__prix" style={{ fontSize: 24 }}>
                  {session.prix}
                </span>
                <span
                  style={{ font: "400 12.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}
                >
                  {t("parPersonne")}
                </span>
                {/* Vers le formulaire de la **même page**, avec la session déjà
                    nommée : le visiteur ne doit pas avoir à retaper l'intitulé
                    qu'il vient de lire. */}
                <Link
                  href={`/formations?service=${encodeURIComponent(session.titre)}#demande`}
                  className="bouton bouton--principal"
                  style={{ marginLeft: "auto" }}
                >
                  {t("reserver")}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: 34,
            padding: 24,
            borderRadius: 14,
            background: "var(--brand-indigo-100)",
            display: "flex",
            gap: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px" }}>
            <h3
              style={{
                margin: 0,
                font: "600 18px/1.3 var(--police-titre)",
                color: "var(--ink-900)",
              }}
            >
              {t("surMesure")}
            </h3>
            <p
              style={{
                margin: "6px 0 0",
                font: "400 14px/1.65 var(--police-texte)",
                color: "var(--ink-500)",
              }}
            >
              {t("surMesureDetail")}
            </p>
          </div>
          <a href="#demande" className="bouton bouton--principal bouton--large">
            {commun("actions.demanderDevis")}
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Le formulaire d'inscription, en bas de page.
 *
 * `sessionChoisie` vient de l'adresse : cliquer « Réserver une place » sur une
 * session amène ici avec son intitulé déjà rempli. Sans session choisie, le
 * sujet reste générique — quelqu'un peut vouloir une formation sur mesure.
 */
function Demande({ sessionChoisie }: { sessionChoisie?: string }) {
  const t = useTranslations("pages.formations");
  const commun = useTranslations("commun");

  return (
    <section className="section section--teinte section--centre">
      <div className="bloc bloc--etroit">
        <FormulaireService
          sujetInitial={sessionChoisie ? `${t("titre")} — ${sessionChoisie}` : t("titre")}
          numeroWhatsapp={commun("cabinet.whatsapp").replace(/\D/g, "")}
        />
      </div>
    </section>
  );
}
