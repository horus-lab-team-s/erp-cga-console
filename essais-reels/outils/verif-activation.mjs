// ⚠️ Outil de vérification en direct, pas un cas de recette : il lit le
// collecteur de courrier et suit un lien à usage unique, ce qu'un cas
// rejouable ne peut pas faire. Se lance à la main : node essais-reels/outils/verif-activation.mjs
import { chromium } from "@playwright/test";

const COURRIER = "http://localhost:8026";
const MDP = "Sylvie Couture Douala 2026 !";

const boite = await (await fetch(`${COURRIER}/api/v1/messages?limit=10`)).json();
const acces = boite.messages
  .filter((m) => (m.Subject || "").includes("immatricul"))
  .sort((a, b) => a.Created.localeCompare(b.Created))
  .at(-1);
const message = await (await fetch(`${COURRIER}/api/v1/message/${acces.ID}`)).json();
const adresse = message.To[0].Address;
const lien = (message.Text.match(/https?:\/\/\S+activation\S*/) || [])[0];
console.log("cliente :", adresse);
console.log("lien    :", lien);

const navigateur = await chromium.launch({ channel: "chrome" });
// ⚠️ La langue du navigateur décide de la langue de la page : sans elle,
// l'intergiciel redirige vers /en et l'on croit à une panne.
const page = await navigateur.newPage({ locale: "fr-FR" });
const erreurs = [];
page.on("console", (m) => m.type() === "error" && erreurs.push(m.text()));

await page.goto(lien);
console.log("1. page d'activation  :", await page.title());
await page.fill('input[name="motDePasse"]', MDP);
await page.fill('input[name="confirmation"]', MDP);
await Promise.all([
  page.waitForLoadState("networkidle"),
  page.click('button[type="submit"]'),
]);
console.log("2. après soumission   :", page.url());
const texte = await page.locator("body").innerText();
console.log("   page               :\n" + texte.split("\n").filter((l) => l.trim()).slice(0, 10).map((l) => "      " + l).join("\n"));

// 3 · La vraie connexion, avec le mot de passe qu'elle vient de choisir.
const hote = new URL(lien).origin;
await page.goto(`${hote}/connexion`);
await page.fill('input[name="courriel"]', adresse);
await page.fill('input[name="motDePasse"]', MDP);
await Promise.all([page.waitForLoadState("networkidle"), page.click('button[type="submit"]')]);
console.log("3. après connexion    :", page.url());
const apres = await page.locator("body").innerText();
console.log("   écran              :", apres.split("\n").filter((l) => l.trim()).slice(0, 4).join(" | ").slice(0, 200));
console.log("   erreurs console    :", erreurs.length ? erreurs.slice(0, 2) : "aucune");
if (process.argv[2]) await page.screenshot({ path: process.argv[2], fullPage: true });
await navigateur.close();
