"use client";

import Image from "next/image";
import { startTransition, useState } from "react";

import type { CompositionOfferte } from "@/app/lib/console-acquisition";
import { montantFcfa } from "@/app/lib/formats";

/**
 * L'aperçu de la proforma, que le responsable retouche avant d'émettre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ, LE 14 OCTOBRE 2026
 *
 * « À la fixation du prix, il doit y avoir un aperçu de la proforma, affiché et
 * éditable par le responsable juridique. » Il choisissait un document dans une
 * liste, tapait un montant à côté, et découvrait le résultat une fois parti chez
 * le client.
 *
 * ⚠️ LE PRIX N'EST PLUS SAISI, IL EST LA SOMME DES LIGNES.
 *
 * Tant qu'un document est choisi, le montant arrêté se lit au bas de la feuille
 * et ne se tape pas. Le responsable qui veut un autre prix modifie la ligne qui
 * change : sept pages de statuts deviennent neuf, une prestation s'ajoute. C'est
 * ce détail qui justifie le prix devant le client, et le serveur refuse un
 * montant que les lignes ne totalisent pas.
 *
 * ⚠️ LA FEUILLE RESSEMBLE AU DOCUMENT, ET CE N'EST PAS UN DÉCOR.
 *
 * Le responsable corrige ce qu'il reconnaît. Un tableau de saisie générique lui
 * ferait relire un formulaire ; l'en-tête, les rubriques numérotées et le
 * cartouche du total lui font relire la proforma qu'il s'apprête à envoyer.
 *
 * ⚠️ L'ENVOI PASSE PAR UNE TRANSITION : après une action de formulaire, React
 * réinitialise les champs non contrôlés. Un refus du serveur effacerait le motif
 * que le responsable vient d'écrire, au moment où on lui demande de corriger.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Ligne = { libelle: string; montant: string };
type Rubrique = { numero: string; intitule: string; lignes: Ligne[] };

const entier = (texte: string) => Number(texte.replace(/\s/g, "")) || 0;

function copier(composition: CompositionOfferte | undefined): Rubrique[] {
  return (composition?.rubriques ?? []).map((r) => ({
    numero: r.numero,
    intitule: r.intitule,
    lignes: r.lignes.map((l) => ({ libelle: l.libelle, montant: String(Math.round(Number(l.montant))) })),
  }));
}

export function FormulaireDEmission({
  reference,
  compositions,
  formeJuridique,
  nomDuClient,
  courriel,
  emettre,
  enCours,
  echec,
}: {
  reference: string;
  compositions: CompositionOfferte[];
  /** La forme juridique de la qualification : c'est elle qui propose le document. */
  formeJuridique: string | null;
  nomDuClient: string;
  courriel: string | null;
  emettre: (donnees: FormData) => void;
  enCours: boolean;
  echec: string | null;
}) {
  // ⚠️ Le document est PROPOSÉ d'après la forme juridique, jamais imposé : le
  // responsable garde la liste, et « aucun document » reste un choix.
  const proposee = compositions.find((c) => c.forme_juridique === formeJuridique);
  const [code, setCode] = useState(proposee?.code ?? "");
  const [rubriques, setRubriques] = useState<Rubrique[]>(() => copier(proposee));
  const composition = compositions.find((c) => c.code === code);

  const total = rubriques.reduce((s, r) => s + r.lignes.reduce((t, l) => t + entier(l.montant), 0), 0);
  const origine = composition ? Math.round(Number(composition.total)) : 0;
  const retouchee = composition !== undefined && JSON.stringify(rubriques) !== JSON.stringify(copier(composition));

  const choisir = (nouveau: string) => {
    setCode(nouveau);
    setRubriques(copier(compositions.find((c) => c.code === nouveau)));
  };
  const modifier = (r: number, l: number, champ: keyof Ligne, valeur: string) =>
    setRubriques((avant) =>
      avant.map((rubrique, i) =>
        i !== r
          ? rubrique
          : { ...rubrique, lignes: rubrique.lignes.map((ligne, j) => (j === l ? { ...ligne, [champ]: valeur } : ligne)) },
      ),
    );
  const ajouter = (r: number) =>
    setRubriques((avant) =>
      avant.map((rubrique, i) => (i === r ? { ...rubrique, lignes: [...rubrique.lignes, { libelle: "", montant: "" }] } : rubrique)),
    );
  const retirer = (r: number, l: number) =>
    setRubriques((avant) =>
      avant.map((rubrique, i) => (i === r ? { ...rubrique, lignes: rubrique.lignes.filter((_, j) => j !== l) } : rubrique)),
    );

  function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    startTransition(() => emettre(donnees));
  }

  return (
    <form action={emettre} onSubmit={soumettre} className="emission">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="score_charge" value="0" />

      <label className="emission__etiquette">
        Document de la proforma
        <select name="composition" value={code} onChange={(e) => choisir(e.target.value)} className="emission__champ">
          <option value="">Aucun document (un montant seul, sans détail)</option>
          {compositions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.titre} · {c.libelle}
              {c.statut !== "VALIDE" ? ` · ${c.statut.toLowerCase()}, non confirmé par la direction` : ""}
            </option>
          ))}
        </select>
        {proposee && code === proposee.code && (
          <span className="emission__indice">
            Proposé d&rsquo;après la forme juridique de la qualification ({formeJuridique}). Vous pouvez en choisir un autre.
          </span>
        )}
      </label>

      {composition ? (
        <>
          <input type="hidden" name="rubriques" value={JSON.stringify(rubriques)} />
          <input type="hidden" name="montant" value={String(total)} />

          <section className="feuille" aria-label="Aperçu de la proforma">
            <header className="feuille__entete">
              <Image src="/marque/cga-logo-couleur.jpg" alt="CGA Broad Range" width={96} height={54} className="feuille__logo" />
              <div className="feuille__bandeau">
                <strong>CGA BROAD RANGE CONSULTING</strong>
                <span>ASSISTANCE COMPTABLE ET FISCALE · ASSISTANCE JURIDIQUE · FORMATIONS · PROCÉDURES ADMINISTRATIVES</span>
              </div>
            </header>
            <h4 className="feuille__titre">{composition.titre}</h4>
            <p className="feuille__libelle">{composition.libelle}</p>
            <p className="feuille__pour">
              <span>Aperçu avant émission</span>
              <span>Établie pour : {nomDuClient}</span>
            </p>

            {rubriques.map((rubrique, r) => {
              const sousTotal = rubrique.lignes.reduce((t, l) => t + entier(l.montant), 0);
              return (
                <div key={rubrique.numero} className="feuille__rubrique">
                  <h5>
                    {rubrique.numero}. {rubrique.intitule}
                  </h5>
                  {rubrique.lignes.map((ligne, l) => (
                    <div key={l} className="feuille__ligne">
                      <input
                        aria-label={`Rubrique ${rubrique.numero}, ligne ${l + 1} : désignation`}
                        value={ligne.libelle}
                        maxLength={200}
                        placeholder="Désignation"
                        onChange={(e) => modifier(r, l, "libelle", e.target.value)}
                      />
                      <input
                        aria-label={`Rubrique ${rubrique.numero}, ligne ${l + 1} : montant`}
                        className="feuille__montant"
                        inputMode="numeric"
                        value={ligne.montant}
                        placeholder="0"
                        onChange={(e) => modifier(r, l, "montant", e.target.value.replace(/[^\d]/g, ""))}
                      />
                      <span className="feuille__devise">FCFA</span>
                      <button
                        type="button"
                        className="feuille__retirer"
                        onClick={() => retirer(r, l)}
                        disabled={rubrique.lignes.length === 1}
                        aria-label={`Retirer la ligne ${l + 1} de la rubrique ${rubrique.numero}`}
                        title={rubrique.lignes.length === 1 ? "Une rubrique garde au moins une ligne" : "Retirer cette ligne"}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="feuille__pied-rubrique">
                    <button type="button" className="feuille__ajouter" onClick={() => ajouter(r)}>
                      + Ajouter une ligne
                    </button>
                    {rubrique.lignes.length > 1 && <strong>{montantFcfa(sousTotal)}</strong>}
                  </div>
                </div>
              );
            })}

            <div className="feuille__total">
              <span>TOTAL GENERAL</span>
              <strong>{montantFcfa(total)}</strong>
            </div>
            <p className="feuille__suite">
              Suivent, sur la seconde page, les documents à fournir, les documents à recevoir, le délai d&rsquo;exécution et
              les moyens de règlement, tels que le référentiel les porte.
            </p>
          </section>

          <p className="emission__prix" role="status">
            Montant arrêté : <strong>{montantFcfa(total)}</strong>
            {retouchee
              ? ` · détail retouché, le document du référentiel totalise ${montantFcfa(origine)}`
              : " · détail du référentiel, non retouché"}
          </p>
        </>
      ) : (
        <label className="emission__etiquette emission__etiquette--court">
          Montant arrêté (FCFA)
          <input name="montant" inputMode="numeric" required className="emission__champ" />
        </label>
      )}

      <label className="emission__etiquette">
        Motif (obligatoire si le montant sort de l&rsquo;intervalle calculé)
        <input name="motif" maxLength={500} className="emission__champ" />
      </label>

      <label className="emission__courriel" data-inactif={courriel ? undefined : "oui"}>
        <input type="checkbox" name="envoyer_par_courriel" value="oui" defaultChecked={Boolean(courriel)} disabled={!courriel} />
        {courriel
          ? `Envoyer la proforma par courriel à ${courriel}, dès l’émission`
          : "Aucun courriel au dossier : l’envoi se fera par WhatsApp ou par téléphone"}
      </label>

      <div className="emission__actions">
        <button type="submit" className="bouton-primaire" disabled={enCours || (composition !== undefined && total <= 0)}>
          {enCours ? "…" : "Émettre la proforma"}
        </button>
        {echec && (
          <p role="alert" className="emission__echec">
            {echec}
          </p>
        )}
      </div>
    </form>
  );
}
