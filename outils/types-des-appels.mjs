/**
 * Relève, avec le compilateur TypeScript, ce que chaque appel `appeler<T>(…)` attend du backend.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE SCRIPT EXISTE (pas 77)
 *
 * Au pas 76, le type d'une pièce déclarait `en_attente_de_traitement`, un champ que
 * la route ne rendait pas. TypeScript vérifie le code, jamais la réponse du réseau :
 * `appeler<T>` affirme que le JSON a la forme `T`, et personne ne le contrôle. Le
 * champ valait `undefined`, et l'espace adhérent comptait zéro pièce en cours.
 *
 * Ce script ne juge rien. Il sort, en JSON, pour chaque appel : le fichier, la
 * méthode, le chemin (les morceaux interpolés remplacés par `{}`), et les champs de
 * `T` avec leur chemin (`compte.courriel`), leur caractère facultatif et leur nature
 * JSON (pas 79). C'est le
 * script Python du backend, `outils/contrat_des_ecrans.py`, qui confronte cette
 * liste au schéma OpenAPI.
 *
 * ⚠️ CE QU'IL NE SAIT PAS LIRE
 *
 * - Un chemin qui n'est ni une chaîne ni un gabarit littéral (une variable) : il est
 *   rendu avec `chemin: null`, et le script Python le signale au lieu de l'ignorer.
 * - Les champs d'un `Record<string, …>`, d'un `unknown` ou d'une union d'objets : il
 *   s'arrête là, sans inventer de champ.
 *
 * USAGE (depuis `Frontend_erp_cga`) :  node outils/types-des-appels.mjs > appels.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

import path from "node:path";
import ts from "typescript";

const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const config = ts.readConfigFile(path.join(racine, "tsconfig.json"), ts.sys.readFile);
const analyse = ts.parseJsonConfigFileContent(config.config, ts.sys, racine);
const programme = ts.createProgram(analyse.fileNames, { ...analyse.options, noEmit: true });
const verificateur = programme.getTypeChecker();

/** Profondeur maximale de descente dans les objets imbriqués. */
const PROFONDEUR = 4;

function estTableau(type) {
  return verificateur.isArrayType(type) || verificateur.isTupleType?.(type);
}

function elementDe(type) {
  const args = verificateur.getTypeArguments(type);
  return args.length ? args[0] : null;
}

/**
 * La nature JSON d'un type : `texte`, `nombre`, `booleen`, `tableau`, `objet`, ou `autre`.
 *
 * ⚠️ Pas 79 : le script ne comparait que les noms. Un montant rendu en nombre et lu comme
 * du texte (le cas du pas 76) passait. `null` et `undefined` sont retirés d'abord : la
 * nullité est une autre question, que ce script ne tranche pas.
 */
function natureDe(type) {
  if (!type) return "autre";
  let t = type;
  if (t.isUnion()) {
    const nonNuls = t.types.filter((x) => !(x.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)));
    if (nonNuls.length === 0) return "autre";
    const natures = new Set(nonNuls.map((x) => natureDe(x)));
    // Une union de littéraux (`"DEBIT" | "CREDIT"`, ou `true | false`) a une seule nature.
    return natures.size === 1 ? [...natures][0] : "autre";
  }
  if (t.flags & ts.TypeFlags.StringLike) return "texte";
  if (t.flags & ts.TypeFlags.NumberLike) return "nombre";
  if (t.flags & ts.TypeFlags.BooleanLike) return "booleen";
  if (estTableau(t)) return "tableau";
  if (t.flags & ts.TypeFlags.Object) return "objet";
  return "autre";
}

/** Les champs d'un type, à plat, avec leur chemin et leur nature. Rien pour un type qu'on ne sait pas lire. */
function champs(type, prefixe = "", profondeur = 0) {
  if (profondeur > PROFONDEUR || !type) return [];
  // `T | null` : on lit `T`. Une union de plusieurs objets : on s'arrête.
  if (type.isUnion()) {
    const nonNuls = type.types.filter((t) => !(t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)));
    if (nonNuls.length !== 1) return [];
    type = nonNuls[0];
  }
  if (estTableau(type)) return champs(elementDe(type), prefixe, profondeur);
  if (!(type.flags & ts.TypeFlags.Object)) return [];
  // Un `Record<string, …>` a une signature d'index et aucun champ nommé : rien à comparer.
  if (verificateur.getIndexInfosOfType(type).length > 0) return [];
  const resultat = [];
  for (const symbole of verificateur.getPropertiesOfType(type)) {
    const nom = `${prefixe}${symbole.getName()}`;
    const facultatif = Boolean(symbole.flags & ts.SymbolFlags.Optional);
    const declaration = symbole.valueDeclaration ?? symbole.declarations?.[0];
    if (!declaration) continue;
    // Les méthodes (un objet `Date`, par exemple) ne sont pas des champs JSON.
    if (ts.isMethodSignature(declaration) || ts.isMethodDeclaration(declaration)) continue;
    const typeDuChamp = verificateur.getTypeOfSymbolAtLocation(symbole, declaration);
    // `nullable` : le type admet `null` (ou `undefined`). Pas 79, pour la mesure de nullité.
    const nullable =
      typeDuChamp.isUnion() &&
      typeDuChamp.types.some((x) => x.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined));
    resultat.push({ champ: nom, facultatif, nullable, nature: natureDe(typeDuChamp) });
    resultat.push(...champs(typeDuChamp, `${nom}.`, profondeur + 1));
  }
  return resultat;
}

/** Le texte d'un morceau de chemin, `${…}` remplacé par `{}`. `null` s'il n'est pas littéral. */
function texteDe(noeud) {
  if (ts.isParenthesizedExpression(noeud)) return texteDe(noeud.expression);
  if (ts.isStringLiteral(noeud) || ts.isNoSubstitutionTemplateLiteral(noeud)) return noeud.text;
  if (ts.isTemplateExpression(noeud)) {
    return noeud.head.text + noeud.templateSpans.map((s) => "{}" + s.literal.text).join("");
  }
  // ⚠️ Pas 78 : un chemin écrit en deux gabarits concaténés (`…/salaries` + `?a_la_date=…`)
  // passait pour illisible. La concaténation de deux littéraux reste un littéral.
  if (ts.isBinaryExpression(noeud) && noeud.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const gauche = texteDe(noeud.left);
    const droite = texteDe(noeud.right);
    return gauche === null || droite === null ? null : gauche + droite;
  }
  return null;
}

/**
 * Le chemin appelé, sans la chaîne de requête. `null` si illisible.
 *
 * ⚠️ Pas 93 : une interpolation **collée** à un mot (`/conformite/controler${requete}`) est
 * une chaîne de requête construite à part, pas un segment de chemin : un segment suit
 * toujours une barre (`/pieces/${id}`). Gardée, elle donnait `/conformite/controler{}`,
 * qu'aucune route ne portait : l'appel de l'essai des règles (pas 90) était compté comme
 * n'atteignant pas sa route, et deux sources de la recherche globale aussi.
 */
function cheminDe(noeud) {
  const brut = texteDe(noeud);
  return brut === null ? null : brut.split("?")[0].replace(/([^/])\{\}/g, "$1");
}

function methodeDe(options) {
  if (!options || !ts.isObjectLiteralExpression(options)) return "GET";
  for (const propriete of options.properties) {
    if (
      ts.isPropertyAssignment(propriete) &&
      propriete.name.getText() === "methode" &&
      ts.isStringLiteral(propriete.initializer)
    ) {
      return propriete.initializer.text;
    }
  }
  return "GET";
}

/** Les fonctions d'appel au backend que l'outil relève (voir `app/lib/api.ts`). */
const APPELANTS = new Set(["appeler", "telecharger"]);

const appels = [];
for (const fichier of programme.getSourceFiles()) {
  const relatif = path.relative(racine, fichier.fileName);
  if (relatif.startsWith("node_modules") || relatif.startsWith("..") || relatif.startsWith(".next")) continue;
  ts.forEachChild(fichier, function visiter(noeud) {
    // ⚠️ Pas 80 : les appels **non typés** sont relevés aussi (`type: null`, sans champs).
    // La grille d'avancement a besoin de la méthode de chaque appel : sans eux, un POST
    // non typé passait pour absent, et un GET voisin sur le même chemin pour un POST.
    // ⚠️ Pas 85 : `telecharger` aussi, qui rend des octets (un export CSV encodé). Il est
    // relevé comme un appel non typé : sa route est vérifiée, et sa page créditée.
    if (ts.isCallExpression(noeud) && APPELANTS.has(noeud.expression.getText(fichier))) {
      const typeNode = noeud.typeArguments?.length === 1 ? noeud.typeArguments[0] : null;
      const { line } = fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier));
      appels.push({
        fichier: `${relatif}:${line + 1}`,
        type: typeNode ? typeNode.getText(fichier) : null,
        methode: methodeDe(noeud.arguments[1]),
        chemin: noeud.arguments[0] ? cheminDe(noeud.arguments[0]) : null,
        champs: typeNode ? champs(verificateur.getTypeFromTypeNode(typeNode)) : [],
      });
    }
    ts.forEachChild(noeud, visiter);
  });
}

// ── Quelles pages atteignent quels appels (pas 80) ──────────────────────────────
//
// ⚠️ Un appel dans `app/lib/obligations.ts` n'est pas « l'échéancier de l'adhérent » :
// il est employé par les pages qui l'atteignent. La première mesure d'avancement
// comptait un geste branché dès qu'un écran quelconque appelait la route, et l'accueil
// adhérent sortait à 100 % grâce aux écrans des collaborateurs.
//
// Le parcours part de chaque `page.tsx` et des `layout.tsx` qui l'enveloppent, et suit
// **les symboles employés** (composants JSX, fonctions, actions serveur, constantes)
// jusqu'à leur déclaration, récursivement, sans jamais entrer dans `node_modules`.
// Suivre les symboles plutôt que les imports évite qu'une page qui importe une seule
// fonction d'un module soit créditée de tous les appels de ce module.

function cleDe(noeud) {
  const f = noeud.getSourceFile();
  return `${path.relative(racine, f.fileName)}:${f.getLineAndCharacterOfPosition(noeud.getStart(f)).line + 1}`;
}

function appelsAtteints(departs) {
  const vus = new Set();
  const atteints = new Set();
  const pile = [...departs];
  while (pile.length) {
    const noeud = pile.pop();
    if (vus.has(noeud)) continue;
    vus.add(noeud);
    ts.forEachChild(noeud, function visiter(n) {
      if (ts.isCallExpression(n) && APPELANTS.has(n.expression.getText())) atteints.add(cleDe(n));
      if (ts.isIdentifier(n)) {
        let symbole = verificateur.getSymbolAtLocation(n);
        if (symbole && symbole.flags & ts.SymbolFlags.Alias) symbole = verificateur.getAliasedSymbol(symbole);
        for (const d of symbole?.declarations ?? []) {
          const fichier = d.getSourceFile().fileName;
          if (fichier.includes("node_modules") || d.getSourceFile().isDeclarationFile) continue;
          if (!vus.has(d)) pile.push(d);
        }
      }
      ts.forEachChild(n, visiter);
    });
  }
  return [...atteints].sort();
}

if (process.argv.includes("--pages")) {
  const base = path.join(racine, "app", "[locale]");
  const parPage = {};
  for (const fichier of programme.getSourceFiles()) {
    if (!fichier.fileName.startsWith(base) || !fichier.fileName.endsWith("/page.tsx")) continue;
    const dossier = path.dirname(fichier.fileName);
    const segments = path.relative(base, dossier).split(path.sep).filter(Boolean);
    const route = "/" + segments.filter((s) => !(s.startsWith("(") && s.endsWith(")"))).join("/");
    // La page, et chaque `layout.tsx` de ses dossiers parents jusqu'à `[locale]`.
    const departs = [fichier];
    for (let d = dossier; d.startsWith(base); d = path.dirname(d)) {
      const gabarit = programme.getSourceFile(path.join(d, "layout.tsx"));
      if (gabarit) departs.push(gabarit);
    }
    parPage[route === "/" ? "/" : route] = appelsAtteints(departs);
  }
  process.stdout.write(JSON.stringify({ appels, parPage }, null, 2));
} else {
  process.stdout.write(JSON.stringify(appels, null, 2));
}
