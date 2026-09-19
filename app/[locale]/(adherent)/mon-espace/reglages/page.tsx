import type { Metadata } from "next";

import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import { ReglerMesRappels } from "@/app/components/adherent/ReglerMesRappels";
import { detient } from "@/app/lib/acces";
import { deconnexion } from "@/app/lib/actions-session";
import { lireMesRappels } from "@/app/lib/espace-adherent";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Réglages — CGA Broad Range Consulting Group",
};

/**
 * Réglages (pas 115, maquette « Espace adhérent CGA », vue F).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SEULS LES RÉGLAGES QUI COMMANDENT QUELQUE CHOSE
 *
 * La maquette en propose six. Sont construits ceux dont l'effet existe :
 *
 *   rappels avant les échéances    oui : un travail périodique les envoie (7 et 2 jours par défaut)
 *   recevoir aussi par WhatsApp    affiché grisé, avec son motif : aucun envoi WhatsApp n'existe
 *   envoyer uniquement en Wi-Fi    non : le navigateur ne dit pas de façon fiable le type de réseau
 *   qualité des photos             non : aucune réduction d'image n'est faite avant l'envoi
 *   langue                         non : l'espace adhérent n'est rédigé qu'en français
 *   code secret et empreinte       non : l'accès se fait par mot de passe (vue A, question Q29)
 *
 * Un interrupteur qui ne commande rien est pire qu'une absence : l'adhérent croit avoir économisé ses
 * données, et ne l'a pas fait.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Reglages() {
  const acces = await exigerAcces();
  // Pas 116 : l'entreprise choisie, et non la première (voir `entreprise-choisie.ts`).
  const { principal } = await monEntrepriseChoisie(acces);
  const rappels =
    principal && detient(acces, "REGLER_SES_RAPPELS") ? await lireMesRappels(principal).catch(() => null) : null;
  return (
    <main className="adherent">
      <header className="adherent__entete">
        <h1 className="adherent__nom">Réglages</h1>
        <Link href="/mon-espace" className="adherent__quitter">
          Accueil
        </Link>
      </header>

      <section className="adherent__section">
        <h2 className="adherent__titre">Rappels avant les échéances</h2>
        {principal && rappels ? (
          <ReglerMesRappels dossier={principal} vue={rappels} />
        ) : (
          <p className="adherent__vide">Vos rappels ne sont pas disponibles pour l&rsquo;instant.</p>
        )}
      </section>

      <section className="adherent__section">
        <h2 className="adherent__titre">Aide et questions</h2>
        <p className="adherent__texte">
          Une question sur votre dossier, une échéance, une pièce : votre interlocuteur au cabinet vous répond.
        </p>
        <p className="adherent__suite">
          <Link href="/mon-espace/entreprise">Voir mon interlocuteur</Link>
        </p>
      </section>

      <section className="adherent__section">
        <form action={deconnexion}>
          <button type="submit" className="adherent__quitter">
            Se déconnecter
          </button>
        </form>
        <p className="adherent__mention">
          Vos envois faits sans réseau restent sur votre téléphone jusqu&rsquo;à leur départ ; tout le reste est
          chez le cabinet.
        </p>
      </section>
      <OngletsAdherent />
    </main>
  );
}
