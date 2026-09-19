import Image from "next/image";

import { ADRESSE_VITRINE } from "@/app/lib/adresse-vitrine";

import { EnteteConsole } from "@/app/components/vitrine/EnteteConsole";
import { FormulaireMotDePasse } from "@/app/components/vitrine/FormulaireMotDePasse";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { PiedConsole } from "@/app/components/vitrine/PiedConsole";
import { Link } from "@/i18n/navigation";

/**
 * La mise en page commune à l'activation et à la réinitialisation.
 *
 * Reprend celle de la connexion — en-tête, pied, fond photographique — pour la
 * raison qui l'y avait imposée : dépouillée de tout repère, la page donne le
 * sentiment d'avoir **quitté le site** pour un service tiers. C'est exactement
 * l'inquiétude à ne pas susciter au moment où quelqu'un choisit un mot de passe
 * en suivant un lien reçu par courriel — le geste que tout hameçonnage imite.
 *
 * ⚠️ SANS JETON, ON N'AFFICHE PAS DE FORMULAIRE
 *
 * Un champ de mot de passe présenté sans jeton ne peut rien produire d'autre
 * qu'un échec après saisie. Mieux vaut dire tout de suite que le lien est
 * incomplet, et où en obtenir un autre.
 */
export function EcranMotDePasse({
  jeton,
  titre,
  chapeau,
  libelleAction,
  note,
}: {
  jeton: string | undefined;
  titre: string;
  chapeau: string;
  libelleAction: string;
  note?: string;
}) {
  return (
    <div className="vitrine">
      <EnteteConsole />
      <main
        style={{
          position: "relative",
          minHeight: "100vh",
          paddingTop: 126,
          paddingBottom: 40,
          background: "var(--brand-indigo-900)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Image
          src="/images/pages/cabinet-b.jpg"
          alt=""
          fill
          sizes="100vw"
          className="heros__image"
        />
        <div className="heros__voile" />

        <div
          className="bloc"
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 520,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* ⚠️ Adresse absolue : « / » de la console mène à la connexion
              depuis la scission, donc le retour bouclait. */}
          <a href={ADRESSE_VITRINE} className="retour-vitrine">
            <IconeVitrine nom="retour" taille={15} />
            Retour au site
          </a>

          <h1 style={{ font: "600 27px/1.25 var(--police-titre)", color: "#fff", margin: 0 }}>
            {titre}
          </h1>
          <p
            style={{
              font: "400 14.5px/1.6 var(--police-texte)",
              color: "rgb(255 255 255 / 78%)",
              margin: 0,
            }}
          >
            {chapeau}
          </p>

          {jeton ? (
            <FormulaireMotDePasse jeton={jeton} libelleAction={libelleAction} />
          ) : (
            <p
              role="alert"
              style={{
                font: "500 14px/1.6 var(--police-texte)",
                color: "#ffd9d6",
                margin: 0,
              }}
            >
              Ce lien est incomplet — il lui manque son jeton. Ouvrez-le depuis le
              courriel plutôt que de le recopier à la main. S’il a expiré,
              demandez-en un nouveau depuis la{" "}
              <Link href="/connexion" style={{ color: "#fff", textDecoration: "underline" }}>
                page de connexion
              </Link>
              .
            </p>
          )}

          {note && (
            <p
              style={{
                font: "400 12.5px/1.6 var(--police-texte)",
                color: "rgb(255 255 255 / 62%)",
                margin: 0,
              }}
            >
              {note}
            </p>
          )}
        </div>
      </main>
      <PiedConsole />
    </div>
  );
}
