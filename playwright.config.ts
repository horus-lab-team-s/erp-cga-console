import { defineConfig, devices } from "@playwright/test";

/**
 * Le parcours réel, dans un vrai navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QUE CE HARNAIS ATTRAPE, ET QUE LES 398 CAS UNITAIRES NE PEUVENT PAS VOIR.
 *
 * Les cas unitaires rendent un composant dans un DOM simulé, avec des données
 * qu'ils fabriquent. Ils ne voient donc RIEN de :
 *
 *   · le rendu côté serveur de Next, et ce qui casse à l'hydratation ;
 *   · le témoin de session réellement posé, et réellement renvoyé ;
 *   · une route qui répond 500 parce qu'un composant serveur lève ;
 *   · une page qui compile et qui, à l'écran, est vide ;
 *   · les en-têtes de sécurité, le cloisonnement, la redirection de langue.
 *
 * C'était le dernier trou de nature différente. Tout le reste du banc est du
 * même tissu : de la logique, éprouvée hors navigateur.
 *
 *
 * ⚠️ **NE PAS LES LANCER PENDANT LA SUITE UNITAIRE DU BACKEND.**
 *
 * Le 30 septembre 2026, huit des quatorze parcours ont échoué, tous au même
 * endroit : la connexion n'aboutissait pas. Aucun défaut du produit. La suite
 * pytest tournait en même temps, et sur une machine chargée `/sante` mettait
 * douze secondes à répondre, là où elle en met un dixième.
 *
 * Rejoués au calme : quatorze sur quatorze, en vingt-trois secondes contre
 * quatre minutes et demie. L'échec ressemble pourtant à une régression de la
 * connexion, et c'est ce qui le rend coûteux.
 *
 * ⚠️ IL EXIGE LA PILE DE DÉMONSTRATION EN SERVICE, et c'est pourquoi il est
 * SÉPARÉ de `npm test`. Un banc unitaire qui exigerait Docker ne tournerait ni
 * sur le poste d'un nouveau venu, ni dans la chaîne. Celui-ci se lance quand on
 * en a besoin :
 *
 *     docker compose -p cga up -d       # la pile
 *     npm run essai-reel
 *
 * ⚠️ IL N'ÉCRIT RIEN DANS LA BASE DE DÉMONSTRATION.
 *
 * Les données d'essai s'accumulent et personne ne les nettoie — c'est déjà un
 * point ouvert du projet. Ce parcours lit, se connecte, saisit dans les champs
 * et vérifie ce que l'écran calcule, mais **n'envoie aucun formulaire
 * d'écriture**. Ce qu'il perd en couverture, il le gagne en pouvoir tourner
 * cent fois sans laisser de trace.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default defineConfig({
  testDir: "./essais-reels",
  // ⚠️ Un seul ouvrier : la limitation de débit du backend compte 30 connexions
  // par tranche de cinq minutes et par adresse. Quatre ouvriers en parallèle
  // l'épuisent, et les cas échouent sur un 429 qui n'est pas un défaut.
  workers: 1,
  fullyParallel: false,
  // Sur un poste partagé avec la pile, une page peut mettre quelques secondes.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.CGA_CONSOLE ?? "http://localhost:3100",
    locale: "fr-FR",
    // La trace d'un échec vaut mieux qu'une capture : elle rejoue le parcours.
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        // ⚠️ LE CHROME DU POSTE, et non celui que Playwright télécharge.
        //
        // Deux raisons. La première est pratique : le téléchargement fait
        // 170 Mo et se refait à chaque montée de version de l'outil. La
        // seconde est meilleure : c'est le navigateur que le cabinet emploie
        // réellement. Un parcours qui passe sur un Chromium d'outil et casse
        // sur le Chrome du poste ne sert à rien.
        //
        // ⚠️ Si le poste n'a pas Chrome, l'essai échoue en le DISANT plutôt
        // que de tourner sur autre chose en silence.
        channel: "chrome",
      },
    },
  ],
});
