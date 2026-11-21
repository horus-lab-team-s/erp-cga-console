"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Un PDF dessiné dans la page, page par page, sur des `<canvas>` (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI : la politique de contenu pose `object-src 'none'` (voir `proxy.ts`), et elle
 * a raison : un justificatif déposé par un adhérent est du contenu venu du dehors, et un
 * PDF peut porter du JavaScript. Mais `<object>` ne montrait donc AUCUN PDF, nulle part :
 * l'aperçu n'a jamais fonctionné que pour les photos. Décision du cabinet : pdf.js, qui
 * DESSINE le document sans rien en exécuter.
 *
 * ⚠️ CE QUI GARDE LA PROTECTION ENTIÈRE
 *
 *   · aucune évaluation de code : depuis la 6.x, pdf.js ne contient plus ni `eval` ni
 *     `new Function` (vérifié dans `pdf.mjs` et `pdf.worker.mjs`, 6.3.289), et la
 *     politique n'a pas à admettre `'unsafe-eval'` ;
 *   · `enableScripting` absent : le JavaScript du PDF n'est jamais lu (c'est le paquet
 *     `pdf.sandbox`, que nous n'importons pas) ;
 *   · pas de travailleur séparé : le moteur tourne dans la page (`pdf.worker` importé ici),
 *     ce qui évite d'ouvrir `worker-src`. Un justificatif fait quelques pages ; le coût est
 *     négligeable ;
 *   · rien ne sort : les octets sont déjà là, reçus par l'action serveur.
 *
 * ⚠️ LE SECOURS (15 octobre 2026, à la demande du cabinet) : si pdf.js ne dessine pas un
 * document, le lecteur de Chrome le montre, depuis l'adresse locale (`blob:`) que la
 * politique admet désormais pour lui seul. Voir `proxy.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ApercuPdf({ base64, libelle, adresse }: { base64: string; libelle: string; adresse?: string }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<{ pages: number } | { echec: string } | null>(null);

  useEffect(() => {
    let abandonne = false;
    const cible = conteneur.current;
    if (!cible) return;
    cible.replaceChildren();
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Le moteur dans la page : voir l'en-tête.
        await import("pdfjs-dist/build/pdf.worker.mjs");
        const octets = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const document = await pdfjs.getDocument({ data: octets }).promise;
        if (abandonne) return;
        const largeur = cible.clientWidth || 800;
        for (let numero = 1; numero <= document.numPages; numero++) {
          const page = await document.getPage(numero);
          if (abandonne) return;
          const echelle = largeur / page.getViewport({ scale: 1 }).width;
          const vue = page.getViewport({ scale: echelle * (window.devicePixelRatio || 1) });
          const toile = window.document.createElement("canvas");
          toile.width = vue.width;
          toile.height = vue.height;
          toile.className = "apercu-pdf__page";
          toile.setAttribute("role", "img");
          toile.setAttribute("aria-label", `${libelle}, page ${numero} sur ${document.numPages}`);
          cible.appendChild(toile);
          await page.render({ canvas: toile, viewport: vue }).promise;
        }
        if (!abandonne) setEtat({ pages: document.numPages });
      } catch (erreur) {
        if (!abandonne) setEtat({ echec: erreur instanceof Error ? erreur.message : String(erreur) });
      }
    })();
    return () => {
      abandonne = true;
    };
  }, [base64, libelle]);

  return (
    <div className="apercu-pdf">
      <div ref={conteneur} className="apercu-pdf__pages" />
      {etat && "echec" in etat &&
        (adresse ? (
          <object data={adresse} type="application/pdf" className="apercu-pdf__secours" aria-label={libelle}>
            <p role="alert" className="apercu-pdf__echec">
              Ce PDF ne s&rsquo;affiche pas ({etat.echec}). Utilisez « Télécharger ».
            </p>
          </object>
        ) : (
          <p role="alert" className="apercu-pdf__echec">
            Ce PDF ne s&rsquo;affiche pas ({etat.echec}). Utilisez « Télécharger ».
          </p>
        ))}
      {etat && "pages" in etat && (
        <p className="apercu-pdf__note">
          {etat.pages} page{etat.pages > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
