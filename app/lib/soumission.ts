/**
 * Soumettre un formulaire à une action **sans que React le réinitialise** (pas 108).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT, VU DANS UN VRAI NAVIGATEUR
 *
 * Avec `<form action={…}>`, React réinitialise le formulaire après chaque action, **refus
 * compris**. Les champs de texte contrôlés s'en remettent (la leçon du pas 100), mais **pas les
 * cases à cocher ni les boutons radio** : la case se décoche à l'écran alors que l'état React,
 * lui, la tient toujours cochée. Essais :
 *
 *   écarter en masse (pas 103)   après un motif refusé, les pièces paraissent décochées ; le
 *                                récapitulatif annonce toujours « Écarter 2 constats », et le
 *                                renvoi les écarte
 *   lettrage (pas 108)           la case qu'on croit décocher se recoche
 *
 * L'écran ment alors sur ce qui va partir, et c'est le pire endroit pour mentir : un écart
 * engage la signature du centre agréé.
 *
 * LA CORRECTION
 *
 * `onSubmit` empêche la soumission native, construit les données **depuis le formulaire tel
 * qu'il est affiché** (bouton déclencheur compris), et appelle l'action dans une transition.
 * La validation du navigateur (`required`, `minLength`) a déjà eu lieu avant l'événement.
 * Rien n'est réinitialisé : après un refus, l'écran montre exactement ce qu'on va renvoyer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { startTransition, type FormEvent } from "react";

export function soumettreSansReinitialiser(envoyer: (donnees: FormData) => void) {
  return (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    const declencheur = (evenement.nativeEvent as SubmitEvent).submitter;
    const donnees = new FormData(evenement.currentTarget, declencheur ?? undefined);
    startTransition(() => envoyer(donnees));
  };
}
