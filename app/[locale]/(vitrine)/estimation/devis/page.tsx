import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { DevisImprimable } from "@/app/components/vitrine/DevisImprimable";
import { DOMICILIATION, FORMES, SUIVI_MENSUEL, estimer } from "@/app/lib/bareme-creation";

/**
 * Le devis, sur sa propre page — partageable et imprimable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UNE PAGE, ET PAS UN FICHIER PDF
 *
 * Parce qu'un lien WhatsApp **ne peut pas porter de pièce jointe** : `wa.me`
 * n'accepte que du texte. Attacher un PDF au message était donc impossible, quel
 * que soit le soin apporté à sa mise en page.
 *
 * Une page résout le problème mieux qu'un fichier ne l'aurait fait :
 *
 * * elle s'envoie comme un lien, sur WhatsApp comme ailleurs, et s'ouvre sur
 *   n'importe quel téléphone sans lecteur à installer ;
 * * elle se transforme en PDF d'un geste — la commande d'impression du
 *   navigateur, présente sur Android comme sur iOS, propose « Enregistrer au
 *   format PDF » ;
 * * elle reste **calculée**, jamais recopiée : le devis se reconstitue à partir
 *   du barème courant, si bien qu'un lien ouvert plus tard affiche des montants
 *   cohérents avec le barème du jour plutôt qu'un chiffre figé.
 *
 * TOUT EST DANS L'ADRESSE
 *
 * Les réponses du visiteur voyagent en paramètres. C'est ce qui rend le devis
 * partageable sans base de données ni identifiant à conserver. Un paramètre
 * absent ou fantaisiste retombe sur une valeur sûre — un lien recopié de travers
 * doit montrer un devis, pas une erreur.
 *
 * ⚠️ Le contenu du devis n'engage pas le cabinet : c'est une estimation, et la
 * page le dit noir sur blanc. Les frais officiels dépendent du dossier réel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.estimation" });
  return {
    title: t("devisTitre"),
    description: t("devisSousTitre"),
    // Hors des moteurs : un devis est un document de travail personnel, il n'a
    // rien à faire dans un index de recherche.
    robots: { index: false, follow: false },
  };
}

/** Lit un entier de l'adresse, en se rabattant sur une valeur sûre. */
function entier(valeur: string | undefined, defaut: number): number {
  const nombre = Number.parseInt(valeur ?? "", 10);
  return Number.isFinite(nombre) && nombre >= 0 ? nombre : defaut;
}

export default async function PageDevis({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const requete = await searchParams;

  const forme = FORMES.find((f) => f.code === requete.forme) ?? FORMES[0];
  const capital = Math.max(forme.capitalMin, entier(requete.capital, forme.capitalMin));
  const associes = Math.max(forme.associesMin, entier(requete.associes, forme.associesMin));
  const ville = requete.ville || "Douala";
  const domiciliation = requete.domiciliation === "1";
  const suivi = requete.suivi === "1";

  const estimation = estimer({ forme, capital, associes, ville, domiciliation });

  return (
    <DevisImprimable
      forme={forme}
      capital={capital}
      associes={associes}
      ville={ville}
      domiciliation={domiciliation}
      suivi={suivi}
      estimation={estimation}
      fraisDomiciliation={DOMICILIATION}
      suiviMensuel={SUIVI_MENSUEL}
    />
  );
}
