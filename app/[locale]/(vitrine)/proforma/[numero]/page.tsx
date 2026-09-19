import type { Metadata } from "next";

import { AcceptationProforma } from "@/app/components/vitrine/AcceptationProforma";
import { consulterLaProforma } from "@/app/lib/actions-acquisition";

// ⚠️ Jamais indexée : son adresse porte un sceau qui vaut authentification.
export const metadata: Metadata = {
  title: "Votre proposition — CGA Broad Range",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function francs(valeur: string): string {
  return `${Number(valeur).toLocaleString("fr-FR")} FCFA`;
}

/**
 * La page où le client lit sa proforma et l'accepte, sans compte (pas 67).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE CLIENT VOIT CE QU'IL ACCEPTE
 *
 * Le prix et ce qui le compose, les débours, l'échéance du lien. Rien de ce qui est
 * interne au cabinet : ni l'intervalle du barème, ni qui a chiffré.
 *
 * ⚠️ UN LIEN QUI NE VAUT PAS NE MONTRE RIEN
 *
 * Sceau faux, expiré, ou numéro inconnu : le backend refuse avant de lire, et la page
 * affiche son refus sans rien révéler de plus.
 *
 * ⚠️ UNE PROFORMA ACCEPTÉE, REMPLACÉE OU ANNULÉE NE PROPOSE PAS D'ACCEPTER
 *
 * Le domaine le refuserait ; l'écran ne propose pas un geste refusé.
 *
 * Les textes sont en français : la traduction de la vitrine pour cette page reste à faire.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PageProforma({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ v?: string; e?: string; s?: string }>;
}) {
  const { numero } = await params;
  const { v = "", e = "", s = "" } = await searchParams;
  const lecture = await consulterLaProforma({ numero, version: v, expire_le: e, sceau: s });

  return (
    <main className="conteneur" style={{ paddingBlock: 48, maxWidth: 760, marginInline: "auto" }}>
      <h1 style={{ marginBottom: 8 }}>Votre proposition</h1>
      {"echec" in lecture ? (
        <p role="alert">
          Ce lien ne permet pas d&rsquo;afficher la proposition. Il a peut-être expiré, ou il a été
          modifié. Demandez au cabinet de vous envoyer un nouveau lien.
        </p>
      ) : (
        <>
          <p style={{ color: "#4f5b60" }}>
            Proposition {lecture.numero} · {lecture.service.replaceAll("-", " ")} · lien valable jusqu&rsquo;au{" "}
            {new Date(lecture.expire_le).toLocaleDateString("fr-FR")}
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: "16px 0" }}>{francs(lecture.montant)}</p>
          {lecture.lignes.length > 0 && (
            <>
              <h2 style={{ fontSize: 16 }}>Ce qui compose le prix</h2>
              <ul>
                {lecture.lignes.map((l) => (
                  <li key={l.libelle}>
                    {l.libelle} : {Number(l.montant) > 0 ? "+" : ""}
                    {francs(l.montant)}
                  </li>
                ))}
              </ul>
            </>
          )}
          {lecture.debours.length > 0 && (
            <>
              <h2 style={{ fontSize: 16 }}>Frais avancés pour votre compte</h2>
              <ul>
                {lecture.debours.map((d) => (
                  <li key={d.libelle}>
                    {d.libelle} : {francs(d.montant)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div style={{ marginTop: 24 }}>
            {lecture.acceptee ? (
              <p role="status" style={{ fontWeight: 600 }}>Vous avez déjà accepté cette proposition.</p>
            ) : lecture.etat === "REMPLACEE" || lecture.etat === "ANNULEE" ? (
              <p role="status">
                Cette proposition {lecture.etat === "REMPLACEE" ? "a été remplacée par une nouvelle version" : "a été annulée"}.
                Le cabinet vous a envoyé, ou vous enverra, le lien de la proposition en cours.
              </p>
            ) : (
              <AcceptationProforma numero={lecture.numero} version={v} expireLe={e} sceau={s} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
