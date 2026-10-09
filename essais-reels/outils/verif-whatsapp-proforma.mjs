// ⚠️ Outil de vérification en direct : il émet une proforma dans la console et
// relit le bouton WhatsApp. Pas un cas de recette — il consomme un dossier.
import { chromium } from "@playwright/test";

const REF = process.argv[2];
const nav = await chromium.launch({ channel: "chrome" });
const page = await nav.newPage({ locale: "fr-FR", viewport: { width: 1500, height: 1050 } });
await page.goto("http://localhost:3100/connexion");
await page.fill('input[name="courriel"]', "b.mballa@cga-brcg.cm");
await page.fill('input[name="motDePasse"]', "cabinet brcg douala 2026");
await Promise.all([page.waitForURL(/tableau-de-bord/), page.click('button[type="submit"]')]);
await page.goto(`http://localhost:3100/acquisition/${REF}`, { waitUntil: "networkidle" });

// ⚠️ ON ÉMET DEPUIS L'ÉCRAN, et non par l'API : le lien n'est affiché qu'une
// fois, au retour de l'action serveur. C'est tout l'objet de ce contrôle.
// L'expert calcule d'abord son intervalle, puis arrête son prix.
await page.getByRole("button", { name: /Calculer l/ }).first().click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(900);
const champ = page.locator('input[name="montant"]');
await champ.waitFor({ timeout: 15000 });
if (!(await champ.inputValue())) await champ.fill("250000");
await page.getByRole("button", { name: /Émettre/ }).first().click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1200);

const bouton = page.locator('a[href*="wa.me"]').first();
const combien = await bouton.count();
console.log("bouton « Envoyer sur WhatsApp » :", combien ? "présent" : "ABSENT");
if (combien) {
  const href = await bouton.getAttribute("href");
  const u = new URL(href);
  console.log("  destinataire :", u.pathname.replace("/", ""));
  console.log("  message      :");
  decodeURIComponent(u.searchParams.get("text") || "")
    .split("\n").filter((l) => l.trim())
    .forEach((l) => console.log("      " + l.slice(0, 96)));
}
const texte = await page.locator("body").innerText();
const i = texte.indexOf("Le client a son lien");
console.log("  état affiché :", i >= 0 ? texte.slice(i, i + 110).split("\n")[0] : "—");
await bouton.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: process.argv[3] });
await nav.close();
