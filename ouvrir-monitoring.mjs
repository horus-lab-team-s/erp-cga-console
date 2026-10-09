// Ouvre une fenêtre RÉELLE, déjà connectée, sur le monitoring et le tableau de
// bord. ⚠️ Elle reste ouverte : le processus dort à la fin, et c'est voulu — une
// fenêtre Playwright se ferme avec son script.
import { chromium } from "@playwright/test";

const nav = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--window-size=1600,1000", "--window-position=40,40"],
});
const ctx = await nav.newContext({ locale: "fr-FR", viewport: null });
const page = await ctx.newPage();

await page.goto("http://localhost:3100/connexion");
await page.fill('input[name="courriel"]', "s.onana@cga-brcg.cm");
await page.fill('input[name="motDePasse"]', "cabinet brcg douala 2026");
await Promise.all([page.waitForURL(/tableau-de-bord/), page.click('button[type="submit"]')]);
console.log("connecté :", page.url());

// Onglet 2 : le tableau de bord de la direction, sur la même session.
const second = await ctx.newPage();
await second.goto("http://localhost:3100/tableau-de-bord", { waitUntil: "domcontentloaded" });

// Onglet 1 revient sur le monitoring, et c'est lui qu'on met au premier plan.
await page.goto("http://localhost:3100/exploitation", { waitUntil: "domcontentloaded" });
await page.bringToFront();

const texte = (await page.locator("body").innerText()).replace(/\s+/g, " ");
const i = texte.indexOf("Charge de la plateforme");
console.log("monitoring à l'écran :", i >= 0 ? "OUI" : "NON");
if (i >= 0) console.log(texte.slice(i, i + 260));

// On tient la fenêtre ouverte huit heures. Le script se tue avec le processus.
await new Promise((r) => setTimeout(r, 8 * 3600 * 1000));
