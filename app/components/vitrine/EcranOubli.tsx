"use client";

import Image from "next/image";
import { useActionState } from "react";

import { EnteteVitrine } from "@/app/components/vitrine/EnteteVitrine";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { PiedVitrine } from "@/app/components/vitrine/PiedVitrine";
import {
  demanderReinitialisation,
  type EtatOubli,
} from "@/app/lib/actions-session";
import { Link } from "@/i18n/navigation";

/**
 * Demander un lien de réinitialisation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA CONFIRMATION EST LA MÊME, ADRESSE CONNUE OU NON
 *
 * C'est la règle la plus importante de cet écran, et la plus contre-intuitive :
 * on ne dit **jamais** « cette adresse n'existe pas ». Le dire donnerait à qui
 * essaie mille adresses la liste des adhérents du cabinet — pour un gain nul,
 * puisque celui qui a vraiment un compte reçoit son lien de toute façon.
 *
 * Le backend applique déjà cette règle. La respecter ici aussi évite qu'un
 * message d'interface la contredise.
 *
 * ⚠️ APRÈS ENVOI, LE FORMULAIRE DISPARAÎT
 *
 * Le laisser afficher inviterait à réessayer, et chaque essai **invalide le lien
 * précédent** — celui qui est peut-être déjà en train d'arriver. Quelqu'un qui
 * clique trois fois se retrouverait avec deux liens morts et un troisième qu'il
 * confondrait avec les autres.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ETAT_INITIAL: EtatOubli = { echec: null, envoye: false };

export function EcranOubli() {
  const [etat, envoyer, enCours] = useActionState(
    demanderReinitialisation,
    ETAT_INITIAL,
  );

  const etiquette: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    font: "600 11.5px/1.4 var(--police-texte)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "rgb(255 255 255 / 72%)",
  };
  const saisie: React.CSSProperties = {
    width: "100%",
    minHeight: 46,
    padding: "0 12px",
    border: "1px solid rgb(255 255 255 / 26%)",
    borderRadius: 9,
    background: "rgb(255 255 255 / 10%)",
    color: "#fff",
    font: "500 14px/1.3 var(--police-texte)",
  };

  return (
    <div className="vitrine">
      <EnteteVitrine />
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
          <Link href="/connexion" className="retour-vitrine">
            <IconeVitrine nom="retour" taille={15} />
            Retour à la connexion
          </Link>

          <h1 style={{ font: "600 27px/1.25 var(--police-titre)", color: "#fff", margin: 0 }}>
            Mot de passe oublié
          </h1>

          {etat.envoye ? (
            <p
              role="status"
              style={{
                font: "400 14.5px/1.7 var(--police-texte)",
                color: "rgb(255 255 255 / 84%)",
                margin: 0,
              }}
            >
              Si un compte correspond à cette adresse, un lien vient d’être envoyé.
              Il est valable <strong>deux heures</strong> et ne fonctionne qu’une
              fois.
              <br />
              <br />
              Vérifiez vos indésirables. Si rien n’arrive, c’est peut-être que
              l’adresse n’est pas celle enregistrée au cabinet — appelez-nous
              plutôt que de réessayer.
            </p>
          ) : (
            <>
              <p
                style={{
                  font: "400 14.5px/1.6 var(--police-texte)",
                  color: "rgb(255 255 255 / 78%)",
                  margin: 0,
                }}
              >
                Saisissez l’adresse de votre compte. Vous recevrez un lien pour en
                choisir un nouveau.
              </p>

              <form className="formulaire-heros" action={envoyer}>
                <div>
                  <label style={etiquette} htmlFor="courriel">
                    Adresse électronique
                  </label>
                  <input
                    id="courriel"
                    name="courriel"
                    type="email"
                    required
                    autoComplete="username"
                    style={saisie}
                  />
                </div>

                {etat.echec && (
                  <p
                    role="alert"
                    style={{ color: "#ffd9d6", font: "500 13px/1.5 var(--police-texte)" }}
                  >
                    {etat.echec}
                  </p>
                )}

                <button
                  type="submit"
                  className="bouton bouton--principal"
                  disabled={enCours}
                >
                  {enCours ? "Envoi…" : "Recevoir un lien"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <PiedVitrine />
    </div>
  );
}
