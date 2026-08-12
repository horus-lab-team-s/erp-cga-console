"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  DOMICILIATION,
  FORMES,
  VILLES,
  VILLES_GUICHET,
  estimer,
} from "@/app/lib/bareme-creation";
import { montantFcfa } from "@/app/lib/formats";
import { Link } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Estimateur de coût de création — maquette, page `surEstimation`.
 *
 * Quatre questions, un montant immédiat, décomposé entre **frais officiels
 * avancés** et **honoraires du cabinet**. Cette séparation n'est pas cosmétique :
 * c'est la première question que pose tout prospect, et la proforma du cabinet
 * la fait apparaître ligne à ligne.
 *
 * La forme peut être imposée par l'adresse (`?forme=SARL`) : les liens du pied
 * de page et du méga-menu s'en servent pour amener le visiteur sur un formulaire
 * déjà rempli plutôt que sur un questionnaire vierge. Un code inconnu est
 * ignoré, on retombe sur la valeur par défaut.
 *
 * ⚠️ Le barème vit encore côté client — voir `lib/bareme-creation.ts` pour
 * pourquoi c'est provisoire et où il doit aller.
 */
export function Estimateur() {
  const t = useTranslations("pages.estimation");
  const commun = useTranslations("commun");

  const parametres = useSearchParams();
  const formeDemandee = parametres.get("forme");
  const [codeForme, setCodeForme] = useState(() =>
    FORMES.some((f) => f.code === formeDemandee) ? (formeDemandee as string) : "SARL",
  );
  // On garde le **texte** saisi, pas un nombre déjà borné.
  //
  // Le champ affichait auparavant `Math.max(capital, capitalMin)`. Effacer un
  // chiffre donnait une chaîne vide, donc 0, donc le minimum légal réécrit dans
  // le champ à l'instant même : il était impossible d'y taper quoi que ce soit,
  // la valeur revenait à chaque touche. Le bornage a lieu au calcul, pas à
  // l'affichage — un champ ne corrige pas ce qu'on est en train d'écrire.
  const [capitalTexte, setCapitalTexte] = useState("");
  const [associesTexte, setAssociesTexte] = useState("");
  const [ville, setVille] = useState("Douala");
  const [suivi, setSuivi] = useState(true);
  const [domiciliation, setDomiciliation] = useState(false);

  const forme = FORMES.find((f) => f.code === codeForme) ?? FORMES[2];
  const capitalApplicable = forme.capitalMin > 0;
  const associesApplicable = forme.associesMax > 1;

  const nombre = (texte: string) => {
    const propre = texte.replace(/[^\d]/g, "");
    return propre === "" ? null : Number(propre);
  };
  const capitalSaisi = nombre(capitalTexte);
  const associesSaisi = nombre(associesTexte);

  // Champ vide : on calcule sur le capital de référence de la forme, celui à
  // partir duquel le droit d'enregistrement proportionnel commence à courir.
  // C'est aussi ce que le repère du champ annonce, donc le chiffre affiché
  // correspond à ce qu'on a sous les yeux.
  const capitalRetenu = Math.max(capitalSaisi ?? forme.capitalReference, forme.capitalMin);
  const associesRetenu = Math.min(
    Math.max(associesSaisi ?? forme.associesMin, forme.associesMin),
    forme.associesMax,
  );

  const estimation = estimer({
    forme,
    capital: capitalRetenu,
    associes: associesRetenu,
    ville,
    domiciliation,
  });

  const numero = commun("cabinet.whatsapp").replace(/\D/g, "");
  const devis = [
    `${t("votreEstimation")} — ${commun("cabinet.nomCourt")}`,
    `${t("q1")} ${t(`formes.${forme.code}`)}`,
    capitalApplicable ? `${t("q2")} : ${montantFcfa(capitalRetenu)}` : null,
    associesApplicable ? `${t("q3")} : ${associesRetenu}` : null,
    `${t("q4")} : ${ville}`,
    `${t("fraisOfficiels")} : ${montantFcfa(estimation.totalOfficiels)}`,
    `${t("nosHonoraires")} : ${montantFcfa(estimation.totalHonoraires)}`,
    `${t("totalRegler")} : ${montantFcfa(estimation.total)}`,
    `${t("delaiAnnonce")} : ${estimation.semaines} ${t("semaines")}`,
    suivi ? `${t("suiviComptable")} : ${t("parMois")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const etiquette: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    font: "600 11.5px/1.4 var(--police-texte)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--ink-500)",
  };
  const saisie: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 46,
    padding: "0 12px",
    border: "1px solid var(--line-200)",
    borderRadius: 9,
    background: "var(--surface)",
    color: "var(--ink-900)",
    font: "500 14px/1.3 var(--police-texte)",
  };
  const aide: React.CSSProperties = {
    margin: "6px 0 0",
    font: "400 12px/1.5 var(--police-texte)",
    color: "var(--ink-500)",
  };

  return (
    <div className="estimateur__grille">
      {/* ── Les quatre questions ─────────────────────────────────────── */}
      <div
        style={{
          padding: 24,
          border: "1px solid var(--line-200)",
          borderRadius: 14,
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div>
          <label style={etiquette} htmlFor="forme">
            {t("q1")}
          </label>
          <select
            id="forme"
            style={saisie}
            value={codeForme}
            onChange={(e) => setCodeForme(e.target.value)}
          >
            {FORMES.map((f) => (
              <option key={f.code} value={f.code}>
                {t(`formes.${f.code}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={etiquette} htmlFor="capital">
            {t("q2")}
          </label>
          <input
            id="capital"
            type="number"
            step={100_000}
            min={forme.capitalMin}
            style={{ ...saisie, opacity: capitalApplicable ? 1 : 0.5 }}
            disabled={!capitalApplicable}
            value={capitalTexte}
            placeholder={montantFcfa(forme.capitalReference)}
            onChange={(e) => setCapitalTexte(e.target.value)}
          />
          {/* Dire la règle plutôt que laisser croire à une panne : sous le
              capital de référence, le droit d'enregistrement est forfaitaire,
              le total ne bouge donc pas. Au-dessus, il devient proportionnel. */}
          <p style={aide}>
            {capitalApplicable
              ? t("capitalRegle", {
                  minimum: montantFcfa(forme.capitalMin),
                  reference: montantFcfa(forme.capitalReference),
                })
              : t("sansObjet")}
          </p>
        </div>

        <div>
          <label style={etiquette} htmlFor="associes">
            {t("q3")}
          </label>
          <input
            id="associes"
            type="number"
            min={forme.associesMin}
            max={forme.associesMax}
            style={{ ...saisie, opacity: associesApplicable ? 1 : 0.5 }}
            disabled={!associesApplicable}
            value={associesTexte}
            placeholder={String(forme.associesMin)}
            onChange={(e) => setAssociesTexte(e.target.value)}
          />
          <p style={aide}>{associesApplicable ? t("ouSaisirNb") : t("unSeulAssocie")}</p>
        </div>

        <div>
          <label style={etiquette} htmlFor="ville">
            {t("q4")}
          </label>
          <select id="ville" style={saisie} value={ville} onChange={(e) => setVille(e.target.value)}>
            {VILLES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          {!VILLES_GUICHET.includes(ville) && <p style={aide}>{t("villeNote")}</p>}
        </div>

        <div>
          <span style={etiquette}>{t("allerPlusLoin")}</span>
          <Option
            actif={suivi}
            onBascule={() => setSuivi((s) => !s)}
            titre={t("optSuivi")}
            detail={t("optSuiviDetail")}
            montant={t("parMois")}
          />
          <Option
            actif={domiciliation}
            onBascule={() => setDomiciliation((d) => !d)}
            titre={t("optDom")}
            detail={t("optDomDetail")}
            montant={montantFcfa(DOMICILIATION)}
          />
        </div>
      </div>

      {/* ── Le résultat ──────────────────────────────────────────────── */}
      <div
        style={{
          alignSelf: "start",
          padding: 24,
          borderRadius: 14,
          background: "var(--brand-indigo-900)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h3 style={{ margin: 0, font: "600 19px/1.3 var(--police-titre)", color: "#fff" }}>
          {t("votreEstimation")}
        </h3>

        <Bloc titre={t("fraisOfficiels")} total={estimation.totalOfficiels}>
          {estimation.detailOfficiels.map((ligne) => (
            <LigneMontant
              key={ligne.cle}
              libelle={t(`lignes.${ligne.cle}`)}
              montant={ligne.montant}
            />
          ))}
        </Bloc>

        <Bloc titre={t("nosHonoraires")} total={estimation.totalHonoraires}>
          <LigneMontant libelle={t("lignes.honorairesBase")} montant={estimation.honorairesBase} />
          {estimation.majorationAssocies > 0 && (
            <LigneMontant
              libelle={t("lignes.majorationAssocies")}
              montant={estimation.majorationAssocies}
            />
          )}
          {estimation.domiciliation > 0 && (
            <LigneMontant libelle={t("lignes.domiciliation")} montant={estimation.domiciliation} />
          )}
        </Bloc>

        {/* Barre de répartition : elle montre d'un coup d'œil quelle part part
            aux administrations et quelle part revient au cabinet. */}
        <div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "rgb(255 255 255 / 18%)",
              overflow: "hidden",
              display: "flex",
            }}
            aria-hidden="true"
          >
            <span
              style={{
                width: `${estimation.partOfficiels}%`,
                background: "#d9a3d6",
              }}
            />
            <span style={{ flex: 1, background: "var(--brand-magenta-600)" }} />
          </div>
          <p
            className="tabulaire"
            style={{
              margin: "8px 0 0",
              font: "400 11.5px/1.5 var(--police-texte)",
              color: "rgb(255 255 255 / 70%)",
            }}
          >
            {estimation.partOfficiels} % {t("fraisOfficiels").toLocaleLowerCase("fr")} ·{" "}
            {100 - estimation.partOfficiels} % {t("nosHonoraires").toLocaleLowerCase("fr")}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            /* Le montant est rendu à 26 px : sur un écran de 320 px il ne tient
               pas à côté de son intitulé. Plutôt que de le rogner, on le laisse
               passer à la ligne — `marginLeft: auto` le garde aligné à droite. */
            flexWrap: "wrap",
            gap: 10,
            paddingTop: 12,
            borderTop: "1px solid rgb(255 255 255 / 20%)",
          }}
        >
          <span style={{ font: "600 12px/1.4 var(--police-texte)", color: "rgb(255 255 255 / 70%)" }}>
            {t("totalRegler")}
          </span>
          <span
            className="tabulaire estimateur__total"
            style={{ marginLeft: "auto", color: "#fff" }}
          >
            {montantFcfa(estimation.total)}
          </span>
        </div>

        <p
          className="tabulaire"
          style={{ margin: 0, font: "400 12.5px/1.6 var(--police-texte)", color: "rgb(255 255 255 / 72%)" }}
        >
          {t("delaiAnnonce")} : {estimation.semaines} {t("semaines")}
          <span style={{ display: "block" }}>
            {t("suiviComptable")} : {suivi ? t("parMois") : t("nonRetenu")}
          </span>
        </p>

        <Link href="/contact" className="bouton bouton--principal bouton--large">
          {t("souscrire")}
          <IconeVitrine nom="fleche" taille={16} />
        </Link>
        <a
          className="bouton bouton--clair bouton--large"
          href={`https://wa.me/${numero}?text=${encodeURIComponent(devis)}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          <IconeVitrine nom="whatsapp" taille={16} />
          {t("devisWhatsapp")}
        </a>

        <p
          style={{
            margin: 0,
            font: "400 11.5px/1.6 var(--police-texte)",
            color: "rgb(255 255 255 / 62%)",
          }}
        >
          {t("note")}
        </p>
      </div>
    </div>
  );
}

function Option({
  actif,
  onBascule,
  titre,
  detail,
  montant,
}: {
  actif: boolean;
  onBascule: () => void;
  titre: string;
  detail: string;
  montant: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        marginTop: 10,
        padding: 14,
        border: `${actif ? 2 : 1}px solid ${actif ? "var(--brand-magenta-600)" : "var(--line-200)"}`,
        borderRadius: 11,
        background: actif ? "var(--brand-magenta-100)" : "var(--surface-alt)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={actif}
        onChange={onBascule}
        style={{ marginTop: 3, flex: "none" }}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", font: "600 13.5px/1.35 var(--police-texte)", color: "var(--ink-900)" }}>
          {titre}
        </span>
        <span style={{ display: "block", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
          {detail}
        </span>
        <span
          className="tabulaire"
          style={{ display: "block", font: "600 12.5px/1.5 var(--police-texte)", color: "var(--brand-magenta-600)" }}
        >
          {montant}
        </span>
      </span>
    </label>
  );
}

function Bloc({
  titre,
  total,
  children,
}: {
  titre: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Même règle que pour le total : l'intitulé en capitales est long et le
          montant ne se rogne pas. Il passe à la ligne au lieu de déborder. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            minWidth: 0,
            font: "600 11.5px/1.4 var(--police-texte)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "rgb(255 255 255 / 70%)",
          }}
        >
          {titre}
        </span>
        <span
          className="tabulaire"
          style={{ marginLeft: "auto", font: "600 14px/1 var(--police-texte)", color: "#fff" }}
        >
          {montantFcfa(total)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}

function LigneMontant({ libelle, montant }: { libelle: string; montant: number }) {
  return (
    <div
      className="tabulaire"
      style={{
        display: "flex",
        gap: 10,
        font: "400 12.5px/1.5 var(--police-texte)",
        color: "rgb(255 255 255 / 72%)",
      }}
    >
      <span style={{ minWidth: 0 }}>{libelle}</span>
      <span style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>{montantFcfa(montant)}</span>
    </div>
  );
}
