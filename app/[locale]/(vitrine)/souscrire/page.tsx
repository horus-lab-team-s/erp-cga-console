import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { FormulaireSouscription } from "@/app/components/vitrine/FormulaireSouscription";
import { montantFcfa } from "@/app/lib/formats";
import { aujourdhui } from "@/app/lib/portefeuille";
import { lireCatalogue, type Service, type Tarif } from "@/app/lib/souscription";

export const metadata: Metadata = {
  title: "Souscrire en ligne — CGA Broad Range",
  description: "Établir un devis au barème du jour et souscrire par Mobile Money.",
};
export const dynamic = "force-dynamic";

/**
 * Souscrire en ligne : le catalogue au barème du jour, puis le devis (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE PRIX AFFICHÉ EST CELUI DU BACKEND
 *
 * Le catalogue est lu au barème du jour sur `/souscription/services`, le même que le
 * devis figera. Les formules de la page « Devenir adhérent » sont un texte de
 * présentation : ici, rien n'est recopié.
 *
 * ⚠️ UN SERVICE NON SOUSCRIPTIBLE EN LIGNE N'EST PAS PROPOSÉ
 *
 * Le champ `souscriptible_en_ligne` du backend en décide, jamais un montant nul qu'on
 * lirait « gratuit ». Les prestations sur étude renvoient vers le cabinet.
 *
 * ⚠️ UN CATALOGUE ILLISIBLE SE DIT
 *
 * Backend injoignable : la page le dit et renvoie au contact, plutôt que d'afficher un
 * formulaire qui échouerait à l'envoi.
 *
 * Les textes sont en français : la traduction de la vitrine pour cette page reste à faire.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Souscrire({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { service } = await searchParams;
  const jour = aujourdhui();
  const catalogue = await lireCatalogue(jour);

  return (
    <main className="conteneur" style={{ paddingBlock: 48, maxWidth: 860, marginInline: "auto", paddingInline: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Souscrire en ligne</h1>
      <p style={{ color: "#4f5b60", marginTop: 0 }}>
        Un devis au barème du jour, valable trente jours, réglé par Mobile Money.
      </p>
      {"echec" in catalogue ? (
        <p role="alert">
          Le catalogue ne peut pas être lu pour le moment ({catalogue.echec}). Vous pouvez joindre le cabinet depuis la page
          Contact.
        </p>
      ) : (
        <Catalogue services={catalogue.valeur} jour={jour} choisi={service} />
      )}
    </main>
  );
}

/** Le tarif en vigueur un jour donné, bornes `du` incluse et `au` exclue. */
function tarifDuJour(tarifs: Tarif[], jour: string): Tarif | undefined {
  return tarifs.find((t) => t.du <= jour && (t.au === null || jour < t.au));
}

function Catalogue({ services, jour, choisi }: { services: Service[]; jour: string; choisi?: string }) {
  const enLigne = services.filter((s) => s.souscriptible_en_ligne);
  const surEtude = services.filter((s) => !s.souscriptible_en_ligne);
  return (
    <>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBlock: 24 }}>
        {enLigne.map((s) => {
          // L'adhésion se tarifie par formule ; les autres services, par leur tarif propre.
          const prix = s.formules.length
            ? s.formules
                .filter((f) => f.souscriptible_en_ligne)
                .map((f) => ({ libelle: f.libelle, tarif: tarifDuJour(f.tarifs, jour) }))
            : [{ libelle: null, tarif: tarifDuJour(s.tarifs, jour) }];
          return (
            <article key={s.code} style={{ border: "1px solid var(--line-200, #d9dee0)", borderRadius: 8, padding: 16 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{s.libelle}</h2>
              {s.resume && <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4f5b60" }}>{s.resume}</p>}
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                {prix.map((p) => (
                  <li key={p.libelle ?? s.code}>
                    {p.libelle ? `${p.libelle} : ` : ""}
                    {p.tarif?.montant ? montantFcfa(p.tarif.montant) : "sur devis"}
                    {s.periodicite === "MENSUELLE" ? " par mois" : s.periodicite === "ANNUELLE" ? " par an" : ""}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>
      {surEtude.length > 0 && (
        <p style={{ fontSize: 14, color: "#4f5b60" }}>
          Sur étude, hors souscription en ligne : {surEtude.map((s) => s.libelle).join(", ")}. Le cabinet vous adresse une
          proposition après examen de votre dossier.
        </p>
      )}
      <h2 style={{ fontSize: 18, marginTop: 32 }}>Votre devis</h2>
      {enLigne.length ? (
        <FormulaireSouscription services={enLigne} choisi={choisi} />
      ) : (
        <p role="status">Aucun service ne se souscrit en ligne aujourd&rsquo;hui.</p>
      )}
    </>
  );
}
