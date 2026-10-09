/**
 * Aucun tiret cadratin dans ce qu'un utilisateur de la console lit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 *
 * La règle du cabinet était appliquée au document de conception et aux gabarits
 * de courriel, que l'intégration continue vérifie. La console y échappait.
 *
 * ⚠️ Elle n'est pas lue que par des collaborateurs : **l'espace adhérent vit
 * ici**, sous `(adherent)/mon-espace`. Un client y lit ses échéances, ses
 * justificatifs et ses documents.
 *
 * La même garde tourne sur la vitrine ; c'est volontairement le même fichier,
 * parce qu'une règle écrite deux fois se corrige une fois sur deux.
 *
 * ⚠️ ON NE VÉRIFIE QUE LES CHAÎNES, PAS LES COMMENTAIRES
 *
 * Un commentaire de code n'est lu que par l'équipe, et la ponctuation y est un
 * outil de lecture. Interdire le cadratin partout ferait réécrire des centaines
 * de commentaires sans qu'aucun client n'y gagne, et la garde deviendrait un
 * bruit qu'on finit par désactiver.
 *
 * ⚠️ LA DÉTECTION EST GROSSIÈRE, ET C'EST VOULU
 *
 * On retire les commentaires puis on cherche le caractère dans ce qui reste.
 * Un analyseur syntaxique serait plus juste et bien plus fragile ; ici, un faux
 * positif se corrige en déplaçant le texte, ce qui ne coûte rien.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CADRATIN = "—";

/** Tous les fichiers de source sous `app/`, tests compris. */
function fichiers(racine: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(racine)) {
    const chemin = join(racine, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin));
    else if (/\.tsx?$/.test(entree)) trouves.push(chemin);
  }
  return trouves;
}

/** Le texte sans ses commentaires de bloc ni ses commentaires de ligne. */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("aucun tiret cadratin dans ce que la console affiche", () => {
  const sources = fichiers(join(process.cwd(), "app"));

  it("balaie réellement la console", () => {
    // ⚠️ Une garde qui ne regarde rien passe toujours.
    expect(sources.length).toBeGreaterThan(80);
  });

  it("aucune chaîne de l'application n'en porte", () => {
    const fautifs: string[] = [];
    for (const chemin of sources) {
      if (chemin.endsWith("tiret-cadratin.test.ts")) continue;
      const nu = sansCommentaires(readFileSync(chemin, "utf8"));
      nu.split("\n").forEach((ligne, i) => {
        if (ligne.includes(CADRATIN)) {
          fautifs.push(`${chemin.replace(process.cwd() + "/", "")}:${i + 1}  ${ligne.trim().slice(0, 100)}`);
        }
      });
    }
    expect(fautifs, `tiret cadratin hors commentaire :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  it("la garde reconnaît bien ce qu'elle cherche", () => {
    // ⚠️ La contre-épreuve : sans elle, on ne saurait pas si le zéro ci-dessus
    // vient de l'absence de défaut ou d'une détection qui ne détecte rien.
    const avecDefaut = `const titre = "Mon dossier ${CADRATIN} CGA";`;
    const enCommentaire = `/* une incise ${CADRATIN} comme celle-ci ${CADRATIN} reste permise */`;
    expect(sansCommentaires(avecDefaut)).toContain(CADRATIN);
    expect(sansCommentaires(enCommentaire)).not.toContain(CADRATIN);
  });
  it("la marque de valeur absente passe par la constante, jamais recopiée", () => {
    // ⚠️ POURQUOI CETTE RÈGLE, ET POURQUOI ICI.
    //
    // `formats.ts` porte `TIRET`, faite pour ce qu'on affiche à la place d'un
    // nombre qu'on n'a pas. Elle était recopiée à la main dans quarante-trois
    // endroits. Le jour où la marque change, ces quarante-trois ne suivent pas,
    // et l'écran devient incohérent sans qu'aucun test ne bouge.
    //
    // La règle vit dans ce fichier parce que c'est le même sujet : quel signe
    // s'affiche au client, et où il est décidé.
    const DEMI = "\u2013";
    const fautifs: string[] = [];
    for (const chemin of sources) {
      if (/formats\.(ts|test\.ts)$/.test(chemin)) continue;
      if (chemin.endsWith("tiret-cadratin.test.ts")) continue;
      const nu = sansCommentaires(readFileSync(chemin, "utf8"));
      nu.split("\n").forEach((ligne, i) => {
        if (ligne.includes(`"${DEMI}"`) || ligne.includes(`>${DEMI}<`)) {
          fautifs.push(
            `${chemin.replace(process.cwd() + "/", "")}:${i + 1}  ${ligne.trim().slice(0, 90)}`,
          );
        }
      });
    }
    expect(
      fautifs,
      `marque recopiée au lieu d'employer TIRET de formats.ts :\n  ${fautifs.join("\n  ")}`,
    ).toEqual([]);
  });
});
