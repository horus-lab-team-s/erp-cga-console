// Ouvre quatre fenêtres RÉELLES sur la pile, pour validation à l'écran.
// ⚠️ Le processus dort à la fin, et c'est voulu : une fenêtre Playwright se
// ferme avec son script.
import { chromium } from "@playwright/test";

const nav = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--window-size=1550,980", "--window-position=30,30"],
});
const ctx = await nav.newContext({ locale: "fr-FR", viewport: null });

// 1 · La console, déjà connectée, sur le monitoring.
const console1 = await ctx.newPage();
await console1.goto("http://localhost:3100/connexion");
await console1.fill('input[name="courriel"]', "s.onana@cga-brcg.cm");
await console1.fill('input[name="motDePasse"]', "cabinet brcg douala 2026");
await Promise.all([
  console1.waitForURL(/tableau-de-bord/),
  console1.click('button[type="submit"]'),
]);
await console1.goto("http://localhost:3100/exploitation", { waitUntil: "domcontentloaded" });
console.log("1 · console (exploitation) :", console1.url());

// 2 · L'acquisition, là où le chargé de clientèle travaille et envoie sur WhatsApp.
const console2 = await ctx.newPage();
await console2.goto("http://localhost:3100/acquisition", { waitUntil: "domcontentloaded" });
console.log("2 · console (acquisition) :", console2.url());

// 3 · La vitrine publique, celle que voit la cliente.
const vitrine = await ctx.newPage();
await vitrine.goto("http://localhost:3101/fr", { waitUntil: "domcontentloaded" });
console.log("3 · vitrine :", vitrine.url());

// 4 · Le collecteur de courriels : ce que la cliente reçoit vraiment.
const courrier = await ctx.newPage();
await courrier.goto("http://localhost:8026/", { waitUntil: "domcontentloaded" });
console.log("4 · boîte aux lettres :", courrier.url());

await console1.bringToFront();
console.log("\nQuatre onglets ouverts. La fenêtre reste ouverte huit heures.");
await new Promise((r) => setTimeout(r, 8 * 3600 * 1000));
