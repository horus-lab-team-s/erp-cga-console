import { notFound } from "next/navigation";

/**
 * La route qui attrape tout ce qu'aucune autre ne sert.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI UNE ROUTE, ET NON UN SIMPLE `not-found.tsx`
 *
 * Le gabarit racine de cette application est `app/[locale]/layout.tsx` : c'est lui
 * qui rend `<html>` et `<body>`. Une adresse inconnue ne correspond à aucun
 * segment, Next ne peut donc entrer dans aucun gabarit, et il sert sa page par
 * défaut — « 404: This page could not be found. », en anglais, sans marque, dans
 * un produit francophone. C'est ce que l'utilisateur voyait.
 *
 * Next 16 offre `app/global-not-found.tsx` pour ce cas, mais derrière le drapeau
 * expérimental `globalNotFound`, désactivé par défaut. On n'active pas un drapeau
 * expérimental sur un produit qui tient la comptabilité de tiers.
 *
 * ⚠️ ELLE EST POSÉE HORS DES GROUPES `(collaborateur)` ET `(adherent)`, et c'est
 * volontaire. Dans l'un d'eux, la page d'erreur hériterait de la coquille
 * authentifiée — barre latérale, nom du collaborateur, menu des dossiers — que
 * l'on servirait alors à quelqu'un qui n'est peut-être pas connecté.
 *
 * ⚠️ Elle ne masque aucun écran réel : Next donne toujours la priorité aux
 * segments statiques sur les segments attrape-tout, quel que soit l'ordre des
 * fichiers.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function Introuvable() {
  notFound();
}
