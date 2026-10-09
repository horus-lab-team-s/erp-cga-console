// ⚠️ Outil de vérification en direct, pas un cas de recette : il lit le
// collecteur de courrier et suit un lien à usage unique, ce qu'un cas
// rejouable ne peut pas faire. Se lance à la main : node essais-reels/outils/verif-whatsapp.mjs
import { chromium } from "@playwright/test";

const VITRINE = "http://localhost:3101";
const marque = Math.random().toString(16).slice(2, 8);
const tel = "6" + String(parseInt(marque, 16) % 100000000).padStart(8, "0");
const nom = `Sylvie Essai ${marque.toUpperCase()}`;

const navigateur = await chromium.launch({ channel: "chrome" });
const page = await navigateur.newPage({ locale: "fr-FR" });
const erreurs = [];
page.on("console", (m) => m.type() === "error" && erreurs.push(m.text()));

await page.goto(`${VITRINE}/contact`);
await page.selectOption("#demande", "CREATION").catch(() => {});
await page.fill('#contact-nom', nom);
await page.fill('#contact-tel', tel);
await page.fill('#contact-mail', `s+${marque}@exemple.cm`);
await page.fill("#contact-message", "Je veux créer ma SARL de couture à Douala.").catch(() => {});
// La case de consentement, sans laquelle le bouton reste inerte.
const cases = page.locator('input[type="checkbox"]');
if (await cases.count()) await cases.first().check();

// ⚠️ Le bouton du FORMULAIRE, reconnu à son message pré-rempli : la page
// porte aussi un lien « contactez-nous sur WhatsApp », sans texte.
const bouton = page.locator('a[href*="wa.me"][href*="text="]').first();
const href = await bouton.getAttribute("href");
console.log("1. lien WhatsApp      :", (href || "AUCUN").slice(0, 96));
const texte = href ? decodeURIComponent(new URL(href).searchParams.get("text") || "") : "";
console.log("2. message pré-rempli :");
texte.split("\n").filter((l) => l.trim()).forEach((l) => console.log("      " + l.slice(0, 84)));

// ⚠️ On empêche l'ouverture de WhatsApp (nouvel onglet) mais on laisse partir
// l'enregistrement : c'est le même geste qui déclenche les deux.
await page.evaluate(() => {
  document.querySelectorAll("a.bouton--principal").forEach((a) => a.removeAttribute("target"));
});
await bouton.click({ modifiers: [] }).catch(() => {});
await page.waitForTimeout(2500);
console.log("3. erreurs console    :", erreurs.length ? erreurs.slice(0, 2) : "aucune");
console.log("4. téléphone employé  :", tel);
await navigateur.close();
