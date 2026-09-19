import type { ReactNode } from "react";

import { Coquille } from "@/app/components/coquille/Coquille";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";
import { lireCompteurs, lireDossiers } from "@/app/lib/portefeuille";
import { lireMesNotifications } from "@/app/lib/notifications";
import "@/app/styles/coquille.css";

/**
 * E00 · Coquille de l'espace collaborateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * C'EST ICI QUE LA PORTE EST GARDÉE
 *
 * `exigerAcces()` est appelé **avant tout rendu**. Sans session valide, la
 * fonction redirige vers la page de connexion et aucun écran de l'espace de
 * travail n'est produit — ni son balisage, ni ses données.
 *
 * Le gabarit est le bon endroit : il enveloppe tous les écrans du groupe, y
 * compris ceux qui n'existent pas encore. Placer le contrôle dans chaque page
 * reviendrait à parier qu'on n'en oubliera aucune.
 *
 * ⚠️ Cela **ne remplace pas** le contrôle côté API. Un gabarit protège des
 * écrans ; il ne protège pas des données, qui s'obtiennent aussi bien par un
 * appel direct au backend. Les routes de B, C, E et F vérifient chacune la
 * session et le périmètre — voir `exiger_dossier` du contexte K.
 *
 * LES DONNÉES COMMUNES SONT CHARGÉES ICI, UNE FOIS
 *
 * Les dossiers du portefeuille et les deux compteurs de la barre latérale sont
 * lus par le serveur et descendus en propriétés. Les charger dans la barre, côté
 * client, produirait un appel par navigation et un menu qui se remplit après
 * coup — l'effet le plus sûr de faire paraître un logiciel lent.
 *
 * La liste est **déjà restreinte** au périmètre de la session : c'est la route
 * qui filtre, pas cet écran. Un comptable reçoit ses trois dossiers, pas les six
 * du cabinet.
 *
 * ⚠️ TOUS LES RÔLES INTERNES N'ONT PAS ACCÈS AUX DOSSIERS
 *
 * L'**administrateur** n'a délibérément aucune permission comptable ni aucune
 * lecture de dossier : il gère les comptes et les habilitations, pas les
 * écritures. C'est une décision de conception du contexte K, et elle est juste —
 * celui qui distribue les droits ne doit pas pouvoir s'en servir.
 *
 * Ce gabarit l'avait oublié. Il appelait `lireDossiers()` sans condition, l'API
 * rendait `403`, et **aucun écran de l'espace de travail ne s'ouvrait** pour un
 * administrateur — pas même celui des comptes, qui est le sien. Un `500` sur
 * chaque page, pour le seul rôle capable de réparer la situation.
 *
 * Le gabarit charge donc ce que le rôle a le droit de lire, et rien de plus. La
 * barre latérale s'affiche sans sélecteur de dossier ; c'est exact, puisqu'il
 * n'y en a aucun à choisir.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function LayoutCollaborateur({ children }: { children: ReactNode }) {
  const acces = await exigerAcces();
  // ⚠️ Conditionné, jamais supposé — voir l'en-tête. Un rôle sans `LIRE_DOSSIER`
  // reçoit une coquille sans portefeuille, pas une erreur.
  const lisDossiers = detient(acces, "LIRE_DOSSIER");
  const [dossiers, compteurs] = lisDossiers
    ? await Promise.all([lireDossiers(), lireCompteurs()])
    : [[], { piecesEnAttente: 0, anomaliesBloquantes: 0 }];

  // Pas 94 : le compteur de la cloche. Lecture de commodité : une panne des notifications
  // laisse la coquille entière, cloche sans pastille, plutôt qu'aucun écran.
  const notificationsNonLues = await lireMesNotifications()
    .then((n) => n.non_lues)
    .catch(() => 0);

  return (
    <Coquille acces={acces} dossiers={dossiers} compteurs={compteurs} notificationsNonLues={notificationsNonLues}>
      {children}
    </Coquille>
  );
}
