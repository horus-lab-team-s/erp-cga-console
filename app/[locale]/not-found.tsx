import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { ADRESSE_VITRINE } from "@/app/lib/adresse-vitrine";
import { Link } from "@/i18n/navigation";
import "@/app/styles/vitrine.css";

/**
 * Page « introuvable » de l'espace de travail.
 *
 * ⚠️ MÊME DESSIN DE CUL-DE-SAC QUE LA PAGE DE CONNEXION, et pour la même raison :
 * on ne sait pas qui est devant l'écran. Un collaborateur connecté qui a suivi un
 * lien périmé, ou un inconnu qui tape une adresse au hasard. Servir la coquille
 * authentifiée à l'un révélerait à l'autre le nom du cabinet, la barre latérale
 * et la liste des écrans. On rend donc une page qui se suffit à elle-même.
 *
 * ⚠️ NI PHOTOGRAPHIE NI DÉCOR. Le § 10.7 du dossier de design : « la photographie
 * est admise sur la vitrine, PROSCRITE DANS L'ESPACE DE TRAVAIL ». Un aplat
 * d'indigo se charge instantanément, ce qui compte quand on vient de tomber sur
 * un lien mort.
 *
 * ⚠️ DEUX SORTIES, ET AUCUNE NE BOUCLE. « Revenir à l'espace de travail » mène à
 * la racine de la console, qui redirige vers la connexion si la session a expiré.
 * Le retour au site passe par une ADRESSE ABSOLUE : depuis la scission, « / » de
 * la console renvoie à la connexion, et un lien relatif ramènerait le visiteur
 * sur la page qu'il cherche à quitter.
 */
export default async function PageIntrouvable() {
  const t = await getTranslations("pages.introuvable");
  const commun = await getTranslations("commun");

  return (
    <div className="vitrine">
      <main
        style={{
          minHeight: "100vh",
          padding: "48px 0",
          background: "var(--brand-indigo-900)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="bloc bloc--etroit">
          <a href={ADRESSE_VITRINE} style={{ display: "inline-block", marginBottom: 28 }}>
            <Image
              src="/marque/cga-logo-blanc.png"
              alt={commun("cabinet.nom")}
              width={132}
              height={74}
              priority
              style={{ width: 132, height: "auto" }}
            />
          </a>
          <span className="heros__kicker">{t("kicker")}</span>
          <h1 className="heros__titre">{t("titre")}</h1>
          <p className="heros__detail">{t("detail")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
            {/* ⚠️ `bouton--principal` et non `bouton` seul. La classe de base
                n'est qu'une FORME : rayon, graisse, marges, et une bordure
                transparente. Elle ne porte aucune couleur, et sur l'aplat
                d'indigo le libellé sortait en indigo-700 sur indigo-900,
                mesuré à 1,42:1. Le geste principal était invisible.
                Le magenta est celui de l'action, conformément au § 10.7 : deux
                couleurs de marque, l'indigo pour l'institution, le magenta pour
                ce qu'on demande de faire. */}
            <Link href="/" className="bouton bouton--principal">
              {t("retourEspace")}
            </Link>
            {/* ⚠️ `bouton--clair` et non `bouton--inverse`. Le blanc plein
                pesait plus lourd que l'action principale et inversait la
                hiérarchie : l'œil partait vers la sortie plutôt que vers le
                retour au travail. La variante claire est dessinée pour les
                fonds sombres, fond blanc à 12 % et bordure à 45 %. */}
            <a href={ADRESSE_VITRINE} className="bouton bouton--clair">
              {commun("actions.retourVitrine")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
