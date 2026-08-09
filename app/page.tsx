import { redirect } from "next/navigation";

/**
 * La racine mène au tableau de bord : c'est l'écran d'ouverture de journée du
 * collaborateur — § 8.1.
 *
 * Le jour où l'espace adhérent existera, l'aiguillage se fera sur le rôle de
 * l'utilisateur authentifié, pas sur l'URL.
 */
export default function Racine() {
  redirect("/tableau-de-bord");
}
