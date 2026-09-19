import type { Metadata } from "next";

import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ListeDesNotifications } from "@/app/components/coquille/ListeDesNotifications";
import { EtatErreur } from "@/app/components/Tableau";
import { ErreurApi } from "@/app/lib/api";
import { lireMesNotifications, type MesNotifications } from "@/app/lib/notifications";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Notifications — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les notifications de la personne connectée (pas 94).
 *
 * ⚠️ La cloche de l'en-tête affichait un compteur écrit en dur (« 4 ») jusqu'au pas 76, où
 * il avait été retiré faute de backend. Elle mène désormais ici, et son compteur vient de
 * la même lecture que cette page.
 */
export default async function Notifications() {
  await exigerAcces();
  let lecture: MesNotifications | null = null;
  let erreur: string | null = null;
  try {
    lecture = await lireMesNotifications();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : String(cause);
  }
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Notifications" }]} />
      <div className="contenu">
        <h1 style={{ margin: 0, font: "600 var(--taille-titre-page)/1.2 var(--police-titre)", color: "var(--ink-900)" }}>
          Notifications
        </h1>
        <p style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
          Ce que le cabinet a fait et qui vous concerne : un écart à trancher, un dossier confié, une déclaration déposée.
        </p>
        {erreur && <EtatErreur titre="Notifications indisponibles" detail={erreur} />}
        {lecture && <ListeDesNotifications lecture={lecture} />}
      </div>
    </>
  );
}
