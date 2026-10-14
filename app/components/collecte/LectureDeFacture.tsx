"use client";

import { startTransition, useState } from "react";

import { enregistrerLaFacture, enregistrerLeBrouillon, lireAutomatiquement, proposerLEcriture } from "@/app/lib/actions-facture";
import type { FactureSaisie, LigneSaisie, PropositionDeLaPiece, ValeurProposee } from "@/app/lib/facture-etats";

/**
 * Lire une facture, la confirmer, proposer son écriture (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ : « une facture chargée transformée rapidement en
 * écriture », avec la lecture automatique par Claude et un collaborateur qui confirme
 * toujours les montants et le NIU.
 *
 * TROIS TEMPS, DANS CET ORDRE
 *
 * 1. Lire : « Lire automatiquement » préremplit ; chaque champ dit s'il est à vérifier.
 *    Sans lecture automatique (pas de clé, format TIFF, panne), on saisit : le même
 *    formulaire, sans préremplissage.
 * 2. Confirmer : les montants se recoupent sous les yeux (lignes = HT, HT + TVA = TTC),
 *    et le NIU actif s'atteste. « Enregistrer la facture » refuse ce qui ne se recoupe pas.
 * 3. Proposer : l'écriture qui en découle, contrôlée ; puis le brouillon, qui se relit et
 *    se valide sur l'écran de saisie, comme tout brouillon.
 *
 * ⚠️ Les champs « à vérifier » restent marqués tant que le collaborateur ne les a pas
 * touchés ou confirmés : la lecture propose, elle ne décide pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const VIDE: FactureSaisie = {
  emetteur: "",
  niu_emetteur: "",
  niu_actif: null,
  reference: "",
  date_emission: "",
  lignes: [{ designation: "", montant_ht: "" }],
  montant_ht: "",
  montant_tva: "",
  montant_ttc: "",
  source: "SAISIE",
};

const entier = (t: string) => Number(String(t).replace(/\s/g, "")) || 0;
const francs = (n: number) => `${n.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;

export function LectureDeFacture({
  identifiant,
  dossier,
  lectureDisponible,
  initiale,
  dejaLue,
}: {
  identifiant: string;
  dossier: string;
  lectureDisponible: boolean;
  initiale: FactureSaisie | null;
  dejaLue: boolean;
}) {
  const [facture, setFacture] = useState<FactureSaisie>(initiale ?? VIDE);
  const [aVerifier, setAVerifier] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ ton: "echec" | "fait" | "info"; texte: string } | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [enregistree, setEnregistree] = useState(dejaLue);
  const [proposition, setProposition] = useState<PropositionDeLaPiece | null>(null);
  const [brouillon, setBrouillon] = useState<string | null>(null);

  const sommeLignes = facture.lignes.reduce((s, l) => s + entier(l.montant_ht), 0);
  const ht = entier(facture.montant_ht);
  const tva = entier(facture.montant_tva);
  const ttc = entier(facture.montant_ttc);
  const lignesRenseignees = facture.lignes.some((l) => l.montant_ht);
  const ecartLignes = lignesRenseignees && sommeLignes !== ht;
  const ecartTotaux = ht > 0 && ttc > 0 && ht + tva !== ttc;

  function changer<K extends keyof FactureSaisie>(cle: K, valeur: FactureSaisie[K]) {
    setFacture((f) => ({ ...f, [cle]: valeur }));
    setAVerifier((a) => {
      const { [cle as string]: _retire, ...reste } = a;
      void _retire;
      return reste;
    });
    setEnregistree(false);
    setProposition(null);
  }
  function changerLigne(i: number, champ: keyof LigneSaisie, valeur: string) {
    changer("lignes", facture.lignes.map((l, j) => (j === i ? { ...l, [champ]: valeur } : l)));
  }

  function lire() {
    setEnCours("lecture");
    setMessage({ ton: "info", texte: "Lecture du document…" });
    startTransition(async () => {
      const r = await lireAutomatiquement(identifiant);
      setEnCours(null);
      if (!r.ok) return setMessage({ ton: "echec", texte: r.echec });
      if (r.valeur.incident) return setMessage({ ton: "echec", texte: r.valeur.incident });
      const v = Object.fromEntries(r.valeur.valeurs.map((x) => [x.champ, x])) as Record<string, ValeurProposee>;
      const texte = (c: string) => (v[c]?.valeur == null ? "" : String(v[c].valeur));
      const lignes = Array.isArray(v.lignes?.valeur)
        ? (v.lignes.valeur as { designation: string; montant_ht: string | null }[]).map((l) => ({
            designation: l.designation,
            montant_ht: l.montant_ht ?? "",
          }))
        : [];
      setFacture({
        emetteur: texte("emetteur"),
        niu_emetteur: texte("niu_emetteur"),
        niu_actif: null,
        reference: texte("reference_document"),
        date_emission: texte("date_emission"),
        lignes: lignes.length ? lignes : [{ designation: "", montant_ht: "" }],
        montant_ht: texte("montant_ht"),
        montant_tva: texte("montant_tva"),
        montant_ttc: texte("montant_ttc"),
        source: "LECTURE_AUTOMATIQUE",
      });
      const correspondance: Record<string, keyof FactureSaisie> = {
        reference_document: "reference",
      };
      setAVerifier(
        Object.fromEntries(
          r.valeur.valeurs
            .filter((x) => x.a_relire)
            .map((x) => [correspondance[x.champ] ?? x.champ, Math.round(Number(x.confiance) * 100)]),
        ),
      );
      setEnregistree(false);
      setProposition(null);
      setMessage({
        ton: "info",
        texte: "Lu. Vérifiez chaque champ marqué « à vérifier », puis enregistrez la facture.",
      });
    });
  }

  function enregistrer(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (ecartLignes || ecartTotaux) {
      return setMessage({ ton: "echec", texte: "Les montants ne se recoupent pas : corrigez avant d'enregistrer." });
    }
    setEnCours("enregistrement");
    const corps: FactureSaisie = {
      ...facture,
      niu_emetteur: facture.niu_emetteur || null,
      lignes: facture.lignes.filter((l) => l.designation && l.montant_ht),
    };
    startTransition(async () => {
      const r = await enregistrerLaFacture(identifiant, corps);
      setEnCours(null);
      if (!r.ok) return setMessage({ ton: "echec", texte: r.echec });
      setEnregistree(true);
      setAVerifier({});
      setMessage({ ton: "fait", texte: "Facture enregistrée : la pièce est lue. Proposez l'écriture." });
    });
  }

  function proposer() {
    setEnCours("proposition");
    startTransition(async () => {
      const r = await proposerLEcriture(dossier, identifiant);
      setEnCours(null);
      if (!r.ok) return setMessage({ ton: "echec", texte: r.echec });
      setProposition(r.valeur);
      setMessage(null);
    });
  }

  function enBrouillon() {
    setEnCours("brouillon");
    startTransition(async () => {
      const r = await enregistrerLeBrouillon(dossier, identifiant);
      setEnCours(null);
      if (!r.ok) return setMessage({ ton: "echec", texte: r.echec });
      setBrouillon(`${r.valeur.exercice}/${r.valeur.journal}/${String(r.valeur.numero).padStart(6, "0")}`);
    });
  }

  const marque = (cle: string) =>
    aVerifier[cle] !== undefined ? (
      <span className="lecture__a-verifier" title={`Confiance de lecture : ${aVerifier[cle]} %`}>
        à vérifier · {aVerifier[cle]} %
      </span>
    ) : null;

  return (
    <div className="lecture">
      {lectureDisponible ? (
        <button type="button" className="bouton-primaire" onClick={lire} disabled={enCours !== null}>
          {enCours === "lecture" ? "Lecture…" : "Lire automatiquement"}
        </button>
      ) : (
        <p className="lecture__note">
          Lecture automatique non configurée : saisissez la facture en vous aidant de l&rsquo;aperçu.
        </p>
      )}

      <form onSubmit={enregistrer} className="lecture__formulaire">
        <label>
          <span>Fournisseur {marque("emetteur")}</span>
          <input value={facture.emetteur} onChange={(e) => changer("emetteur", e.target.value)} required maxLength={200} />
        </label>
        <label>
          <span>NIU du fournisseur {marque("niu_emetteur")}</span>
          <input
            value={facture.niu_emetteur ?? ""}
            onChange={(e) => changer("niu_emetteur", e.target.value.toUpperCase())}
            maxLength={32}
            placeholder="M081234567890P"
          />
        </label>
        <label className="lecture__case">
          <input
            type="checkbox"
            checked={facture.niu_actif === true}
            onChange={(e) => changer("niu_actif", e.target.checked ? true : null)}
          />
          <span>J&rsquo;ai vérifié sur le portail de la DGI que ce NIU est actif (sans cela, ni la TVA ni la charge ne se déduisent)</span>
        </label>
        <div className="lecture__deux">
          <label>
            <span>N° de facture {marque("reference")}</span>
            <input value={facture.reference} onChange={(e) => changer("reference", e.target.value)} required maxLength={64} />
          </label>
          <label>
            <span>Date {marque("date_emission")}</span>
            <input type="date" value={facture.date_emission} onChange={(e) => changer("date_emission", e.target.value)} required />
          </label>
        </div>

        <fieldset className="lecture__lignes">
          <legend>Lignes {marque("lignes")}</legend>
          {facture.lignes.map((l, i) => (
            <div key={i} className="lecture__ligne">
              <input aria-label={`Ligne ${i + 1} : désignation`} placeholder="Désignation" value={l.designation} onChange={(e) => changerLigne(i, "designation", e.target.value)} />
              <input aria-label={`Ligne ${i + 1} : montant HT`} placeholder="HT" inputMode="numeric" value={l.montant_ht} onChange={(e) => changerLigne(i, "montant_ht", e.target.value.replace(/[^\d]/g, ""))} />
              <button type="button" className="bouton-discret" disabled={facture.lignes.length === 1} onClick={() => changer("lignes", facture.lignes.filter((_, j) => j !== i))} aria-label={`Retirer la ligne ${i + 1}`}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="bouton-discret" onClick={() => changer("lignes", [...facture.lignes, { designation: "", montant_ht: "" }])}>
            + Ajouter une ligne
          </button>
          {lignesRenseignees && (
            <p className={ecartLignes ? "lecture__ecart" : "lecture__accord"}>
              Somme des lignes : {francs(sommeLignes)}
              {ecartLignes ? ` · ne fait pas le HT (${francs(ht)})` : " · égale au HT"}
            </p>
          )}
        </fieldset>

        <div className="lecture__trois">
          <label>
            <span>Total HT {marque("montant_ht")}</span>
            <input inputMode="numeric" value={facture.montant_ht} onChange={(e) => changer("montant_ht", e.target.value.replace(/[^\d]/g, ""))} required />
          </label>
          <label>
            <span>TVA {marque("montant_tva")}</span>
            <input inputMode="numeric" value={facture.montant_tva} onChange={(e) => changer("montant_tva", e.target.value.replace(/[^\d]/g, ""))} required />
          </label>
          <label>
            <span>Total TTC {marque("montant_ttc")}</span>
            <input inputMode="numeric" value={facture.montant_ttc} onChange={(e) => changer("montant_ttc", e.target.value.replace(/[^\d]/g, ""))} required />
          </label>
        </div>
        {ecartTotaux && <p className="lecture__ecart">HT + TVA = {francs(ht + tva)}, la facture annonce {francs(ttc)}.</p>}

        <button type="submit" className="bouton-primaire" disabled={enCours !== null || ecartLignes || ecartTotaux}>
          {enCours === "enregistrement" ? "…" : enregistree ? "Facture enregistrée" : "Enregistrer la facture"}
        </button>
      </form>

      {message && (
        <p role={message.ton === "echec" ? "alert" : "status"} className="lecture__message" data-ton={message.ton}>
          {message.texte}
        </p>
      )}

      {enregistree && (
        <section className="lecture__proposition" aria-label="Écriture proposée">
          <button type="button" className="bouton-primaire" onClick={proposer} disabled={enCours !== null}>
            {enCours === "proposition" ? "…" : "Proposer l'écriture"}
          </button>
          {proposition && !proposition.comptabilisable && (
            <div className="lecture__empechements" role="alert">
              <strong>L&rsquo;écriture ne peut pas être passée en l&rsquo;état.</strong>
              <ul>
                {proposition.empechements.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {proposition?.saisie && (
            <>
              <table className="lecture__ecriture">
                <caption>
                  {proposition.saisie.libelle} · journal {proposition.saisie.journal} · n° pressenti {proposition.numero_pressenti}
                </caption>
                <thead>
                  <tr>
                    <th>Compte</th>
                    <th>Libellé</th>
                    <th>Débit</th>
                    <th>Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {proposition.saisie.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className="tabulaire">{l.compte}</td>
                      <td>
                        {l.libelle}
                        {l.tiers ? ` · ${l.tiers}` : ""}
                      </td>
                      <td className="tabulaire">{l.sens === "DEBIT" ? francs(entier(l.montant)) : ""}</td>
                      <td className="tabulaire">{l.sens === "CREDIT" ? francs(entier(l.montant)) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {brouillon ? (
                <p className="lecture__accord" role="status">
                  Brouillon {brouillon} enregistré. Il se relit et se valide sur l&rsquo;écran de saisie ; la validation
                  passe la pièce à « comptabilisée ».
                </p>
              ) : (
                <button type="button" className="bouton-primaire" onClick={enBrouillon} disabled={enCours !== null}>
                  {enCours === "brouillon" ? "…" : "Enregistrer en brouillon"}
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
