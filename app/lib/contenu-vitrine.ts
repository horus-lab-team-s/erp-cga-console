import {
  ARTICLES,
  RUBRIQUES,
  articleParSlug,
  articlesDeLaRubrique,
  articlesVoisins,
  comptesParRubrique,
  type Article,
  type CleRubrique,
} from "@/app/lib/blog";
import { annonceDuJour, type Annonce } from "@/app/lib/annonces";
import { INSTITUTIONS, type Institution } from "@/app/lib/partenaires";

/**
 * Le contenu de la vitrine, lu au backend.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OÙ VIT LE CONTENU
 *
 * Au backend, contexte L · Vitrine, dans `Contenu_vitrine/*.yaml`. Le cabinet
 * corrige une phrase dans un fichier, et le site suit — sans développeur, sans
 * recompilation. Ce module est le seul point du site qui sait où aller le
 * chercher.
 *
 * POURQUOI IL Y A QUAND MÊME UN SECOURS
 *
 * Le site public est ce qu'un prospect voit en premier. Si le backend est
 * arrêté, en cours de déploiement, ou simplement joignable une seconde trop
 * tard, la vitrine ne doit pas s'afficher vide : ce serait pire que d'afficher
 * un contenu d'hier. Chaque lecture retombe donc sur les modules
 * `app/lib/blog.ts`, `annonces.ts` et `partenaires.ts`, qui portent le dernier
 * état connu.
 *
 * ⚠️ Ces modules sont un **secours**, pas la source. La source est le YAML. Une
 * modification faite ici n'apparaîtra en ligne que si le backend tombe — c'est
 * exactement l'inverse de ce qu'on veut. Pour changer le site, on change le
 * YAML.
 *
 * ⚠️ CE MODULE NE S'IMPORTE QUE DEPUIS UN COMPOSANT SERVEUR
 *
 * Il tire le contenu de secours, donc l'intégralité des articles : importé
 * depuis un composant client, il partirait dans le paquet envoyé au navigateur.
 * Les pages du blog et la coquille de la vitrine sont des composants serveur ;
 * les composants clients reçoivent leurs données en propriétés.
 *
 * LA FRAÎCHEUR
 *
 * `revalidate` laisse Next servir la page depuis son cache et la reconstruire en
 * arrière-plan. Le visiteur n'attend jamais le backend ; une correction est en
 * ligne au bout de quelques minutes. C'est le bon compromis pour un contenu qui
 * change quelques fois par mois.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Racine de l'API. Réglable par environnement — préproduction, conteneur, poste. */
const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Durée de cache d'une lecture de contenu, en secondes. */
const FRAICHEUR = 300;

/**
 * Résultat d'une lecture. `repondu` distingue deux situations que `null`
 * confondrait, et cette confusion serait un vrai défaut : le backend qui répond
 * « il n'y a pas d'annonce aujourd'hui » et le backend qui ne répond pas du tout
 * appellent des conduites opposées. Dans le premier cas on n'affiche rien ; dans
 * le second on affiche le secours.
 */
type Lecture<T> = { repondu: true; valeur: T } | { repondu: false };

/**
 * Appelle le backend sans jamais laisser l'échec remonter jusqu'à la page.
 *
 * Un backend absent n'est pas une anomalie du site : c'est un état prévu, traité
 * par le secours. On le trace en console — l'exploitant doit le voir — mais le
 * visiteur, lui, ne doit rien remarquer.
 */
async function lire<T>(chemin: string): Promise<Lecture<T>> {
  try {
    const reponse = await fetch(`${API}${chemin}`, {
      next: { revalidate: FRAICHEUR },
      headers: { Accept: "application/json" },
    });
    // 404 compris : un article absent du backend doit être cherché au secours
    // avant qu'on conclue qu'il n'existe pas.
    if (!reponse.ok) return { repondu: false };
    return { repondu: true, valeur: (await reponse.json()) as T };
  } catch (erreur) {
    console.warn(`[vitrine] backend injoignable sur ${chemin} — passage au secours`, erreur);
    return { repondu: false };
  }
}

// ── Formes rendues par le backend ────────────────────────────────────────────
//
// Le backend parle « serpent » (`mots_cles`), le front parle « chameau »
// (`motsCles`). La conversion est faite ici, une fois, plutôt que dans chaque
// composant : le reste du site ne doit pas savoir que ces deux conventions
// coexistent.

type ArticleDistant = Omit<Article, "motsCles"> & { mots_cles: string[] };
type AnnonceDistante = Omit<Annonce, "libelleLien"> & { libelle_lien: string };
type InstitutionDistante = Omit<Institution, "rognageBas"> & { rognage_bas: number | null };

function versArticle(distant: ArticleDistant): Article {
  const { mots_cles, ...reste } = distant;
  return { ...reste, motsCles: mots_cles ?? [] };
}

function versAnnonce(distante: AnnonceDistante): Annonce {
  const { libelle_lien, ...reste } = distante;
  return { ...reste, libelleLien: libelle_lien };
}

function versInstitution(distante: InstitutionDistante): Institution {
  const { rognage_bas, ...reste } = distante;
  return { ...reste, rognageBas: rognage_bas ?? undefined };
}

// ── Lectures ─────────────────────────────────────────────────────────────────

export type Sommaire = {
  articles: Article[];
  comptes: Record<CleRubrique, number>;
};

/** Le sommaire du blog : les articles, et le compte par rubrique pour le filtre. */
export async function lireSommaire(rubrique: CleRubrique | null): Promise<Sommaire> {
  const chemin = rubrique ? `/vitrine/articles?rubrique=${rubrique}` : "/vitrine/articles";
  const lu = await lire<{
    articles: ArticleDistant[];
    comptes_par_rubrique: Record<CleRubrique, number>;
  }>(chemin);

  if (lu.repondu) {
    return {
      articles: lu.valeur.articles.map(versArticle),
      comptes: lu.valeur.comptes_par_rubrique,
    };
  }
  return { articles: articlesDeLaRubrique(rubrique), comptes: comptesParRubrique() };
}

export type ArticleEtVoisins = { article: Article; voisins: Article[] } | null;

/** Un article et ce qu'on propose de lire ensuite, ou `null` s'il n'existe nulle part. */
export async function lireArticle(slug: string): Promise<ArticleEtVoisins> {
  const lu = await lire<{ article: ArticleDistant; voisins: ArticleDistant[] }>(
    `/vitrine/articles/${slug}`,
  );
  if (lu.repondu) {
    return {
      article: versArticle(lu.valeur.article),
      voisins: lu.valeur.voisins.map(versArticle),
    };
  }

  const secours = articleParSlug(slug);
  return secours ? { article: secours, voisins: articlesVoisins(secours) } : null;
}

/**
 * Les slugs à pré-rendre à la construction.
 *
 * ⚠️ Backend injoignable au moment du `build` : on pré-rend ce que le secours
 * connaît. Un article ajouté au YAML depuis serait servi à la demande plutôt que
 * pré-rendu — plus lent au premier appel, mais présent. Refuser de construire
 * parce que le backend dort serait un bien plus mauvais échange.
 */
export async function lireSlugs(): Promise<string[]> {
  const lu = await lire<{ articles: ArticleDistant[] }>("/vitrine/articles");
  return (lu.repondu ? lu.valeur.articles : ARTICLES).map((article) => article.slug);
}

/**
 * L'annonce à afficher aujourd'hui, ou `null`.
 *
 * La date est calculée côté serveur. Le cabinet, ses adhérents et le serveur sont
 * tous à l'heure du Cameroun : distinguer le fuseau du visiteur coûterait un
 * appel depuis le navigateur pour un cas qui ne se présente pas.
 */
export async function lireAnnonce(): Promise<Annonce | null> {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const lu = await lire<AnnonceDistante | null>(`/vitrine/annonce?a_la_date=${aujourdhui}`);
  if (lu.repondu) {
    // Le backend a répondu `null` : il n'y a rien à afficher aujourd'hui. C'est
    // une réponse, pas une panne — le secours n'a pas à la contredire, sans quoi
    // une annonce retirée par le cabinet réapparaîtrait toute seule.
    return lu.valeur === null ? null : versAnnonce(lu.valeur);
  }
  return annonceDuJour(aujourdhui);
}

/** Les institutions du ruban. */
export async function lireInstitutions(): Promise<Institution[]> {
  const lu = await lire<InstitutionDistante[]>("/vitrine/institutions");
  return lu.repondu ? lu.valeur.map(versInstitution) : INSTITUTIONS;
}

/** Les rubriques connues du site. Elles sont structurelles, jamais éditoriales. */
export { RUBRIQUES };
