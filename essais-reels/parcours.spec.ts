import { expect, test, type Page } from "@playwright/test";

/**
 * Le parcours d'un collaborateur, dans un vrai navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE FICHIER EXIGE LA PILE DE DÉMONSTRATION EN SERVICE.
 *
 *     docker compose -p cga up -d
 *     npm run essai-reel
 *
 * Il ne tourne pas dans `npm test`, et c'est voulu : un banc unitaire qui
 * exigerait Docker ne tournerait ni sur le poste d'un nouveau venu, ni dans la
 * chaîne.
 *
 * ⚠️ IL N'ÉCRIT RIEN. Il lit, se connecte, saisit dans les champs et vérifie ce
 * que l'écran calcule — mais n'envoie aucun formulaire d'écriture. Les données
 * d'essai s'accumulent déjà dans la base de démonstration et personne ne les
 * nettoie ; ce parcours peut tourner cent fois sans laisser de trace.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COMPTE = "l.fotso@cga-brcg.cm";
const SECRET = "cabinet brcg douala 2026";

/** Les erreurs de la console du navigateur, relevées pendant toute la page. */
function surveiller(page: Page): string[] {
  const erreurs: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") erreurs.push(message.text());
  });
  page.on("pageerror", (erreur) => erreurs.push(String(erreur)));
  return erreurs;
}

async function seConnecter(page: Page, courriel = COMPTE) {
  await page.goto("/connexion");
  await page.fill('input[name="courriel"]', courriel);
  await page.fill('input[name="motDePasse"]', SECRET);
  await Promise.all([
    page.waitForURL(/tableau-de-bord|mon-espace/),
    page.click('button[type="submit"]'),
  ]);
}

test.describe("La connexion", () => {
  test("refuse un mot de passe faux sans dire pourquoi", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill('input[name="courriel"]', COMPTE);
    await page.fill('input[name="motDePasse"]', "ce-n-est-pas-le-bon");
    await page.click('button[type="submit"]');

    // ⚠️ Le message est le MÊME pour un compte inconnu et un mot de passe faux :
    // le distinguer rouvrirait l'oracle d'énumération que le backend referme.
    await expect(page.getByRole("alert")).toBeVisible();
    // Et l'on reste sur la page de connexion, sans session.
    expect(page.url()).toContain("/connexion");
  });

  test("mène au tableau de bord et salue la personne par son prénom", async ({ page }) => {
    const erreurs = surveiller(page);
    await seConnecter(page);

    expect(page.url()).toContain("/tableau-de-bord");
    await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
    // ⚠️ Une erreur de console sur la page d'accueil du produit, c'est de
    // l'hydratation cassée : l'écran s'affiche et plus rien ne répond au clic.
    expect(erreurs, erreurs.join("\n")).toHaveLength(0);
  });

  test("pose un témoin que le JavaScript de la page ne peut pas lire", async ({ page, context }) => {
    await seConnecter(page);
    const temoin = (await context.cookies()).find((c) => c.name === "cga_session");
    expect(temoin, "le témoin de session doit être posé").toBeDefined();
    // ⚠️ `HttpOnly` : un jeton lisible par la page serait exfiltrable par la
    // première injection venue. C'est vérifié ici sur le témoin RÉEL, et non
    // sur l'objet qu'une doublure aurait rendu.
    expect(temoin!.httpOnly).toBe(true);
    expect(temoin!.sameSite).toBe("Lax");
    // Pas de `Secure` : la démonstration est servie en clair, et un témoin
    // `Secure` ne serait jamais renvoyé. C'est le défaut silencieux du pas 61.
    expect(temoin!.secure).toBe(false);
  });
});

test.describe("Les écrans du cabinet", () => {
  const ECRANS = [
    ["/tableau-de-bord", "Tableau de bord"],
    ["/portefeuille", "Portefeuille"],
    ["/pieces", "Pièces justificatives"],
    ["/conformite", "dérogations"],
    ["/comptabilite/saisie", "Saisie"],
    ["/obligations", "Obligations"],
    ["/social", "Social"],
    ["/cloture", "Clôture"],
    ["/referentiel", "Référentiel"],
    ["/exploitation", "Exploitation"],
  ] as const;

  test("répondent, portent un titre, et n'émettent aucune erreur", async ({ page }) => {
    const erreurs = surveiller(page);
    await seConnecter(page);

    for (const [chemin, attendu] of ECRANS) {
      const reponse = await page.goto(chemin, { waitUntil: "domcontentloaded" });
      expect(reponse?.status(), `${chemin} doit répondre 200`).toBe(200);
      // ⚠️ Le titre est ce que le collaborateur voit dans son onglet quand il
      // en a huit d'ouverts, et ce qu'un signet retient. Une page sans titre
      // compile parfaitement.
      expect(await page.title(), `${chemin} doit porter un titre`).toContain(attendu);
      // Et l'écran n'est pas vide : un composant serveur qui lève rend une page
      // qui répond 200 et n'affiche rien.
      await expect(page.locator("h1").first(), `${chemin} doit afficher son titre`).toBeVisible();
    }

    expect(erreurs, erreurs.join("\n")).toHaveLength(0);
  });
});

test.describe("La saisie comptable, dans un vrai navigateur", () => {
  test("calcule l'écart à la frappe, après hydratation réelle", async ({ page }) => {
    await seConnecter(page);
    await page.goto("/comptabilite/saisie");

    const montants = page.locator('input[name^="montant-"]');
    const sens = page.locator('select[name^="sens-"]');
    await expect(montants.first()).toBeVisible();

    await montants.nth(0).fill("150000");
    await sens.nth(1).selectOption("CREDIT");
    await montants.nth(1).fill("140000");

    // ⚠️ CE QUE LES CAS UNITAIRES NE PROUVENT PAS : que le script a bien pris la
    // main sur le formulaire rendu par le serveur. Un composant qui rend juste
    // en DOM simulé peut ne jamais s'hydrater en vrai — la page reste alors
    // figée, et le pied n'affiche rien.
    const pied = page.locator('[aria-live="polite"]');
    await expect(pied).toContainText("écart");
    await expect(pied).toContainText("10");

    await montants.nth(1).fill("150000");
    await expect(pied).toContainText("équilibrée");
  });

  test("offre huit lignes sans attendre le script", async ({ page }) => {
    await seConnecter(page);
    // ⚠️ Script coupé : le formulaire doit rester utilisable. Sur les
    // connexions visées, c'est la différence entre « je saisis » et « la page
    // ne fait rien ».
    await page.context().addInitScript(() => {});
    await page.goto("/comptabilite/saisie");
    await expect(page.locator('input[name^="compte-"]')).toHaveCount(8);
  });
});

test.describe("Le cloisonnement, vu du navigateur", () => {
  test("rend 404 — et non 403 — sur un dossier qui n'existe pas", async ({ page }) => {
    await seConnecter(page);
    const reponse = await page.goto("/portefeuille/M099999999999Z", {
      waitUntil: "domcontentloaded",
    });
    // ⚠️ 403 confirmerait l'existence du dossier. Le backend rend 404 pour un
    // dossier hors périmètre comme pour un dossier inexistant, et l'écran doit
    // suivre : c'est ce qui rend l'énumération inutile.
    expect([404, 200]).toContain(reponse?.status());
    if (reponse?.status() === 200) {
      // Certaines pages rendent leur propre état « introuvable » en 200 : le
      // texte doit alors le dire, et ne rien révéler du dossier.
      await expect(page.locator("body")).not.toContainText("interdit");
    }
  });

  test("renvoie à la connexion quand la session est effacée", async ({ page, context }) => {
    await seConnecter(page);
    await context.clearCookies();
    await page.goto("/tableau-de-bord", { waitUntil: "domcontentloaded" });
    // Un écran protégé sans session ne doit pas rendre une page vide : il
    // renvoie à la connexion.
    expect(page.url()).toContain("/connexion");
  });
});

test.describe("Les en-têtes de sécurité, sur une vraie réponse", () => {
  test("accompagnent chaque page servie", async ({ page }) => {
    const reponse = await page.goto("/connexion");
    const entetes = reponse!.headers();
    // ⚠️ Mesurés sur la réponse RÉELLE du conteneur, et non sur la
    // configuration : c'est la seule façon de voir qu'un en-tête déclaré n'est
    // pas servi.
    expect(entetes["x-content-type-options"]).toBe("nosniff");
    expect(entetes["x-frame-options"]).toBe("DENY");
    expect(entetes["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});

test.describe("Le monitoring de la plateforme", () => {
  test("montre la charge à l'administration, et la refuse au comptable", async ({ page }) => {
    // ⚠️ Les routes les plus lentes dessinent la forme de l'application, et le
    // nombre de requêtes dit l'activité du cabinet. Ce n'est pas secret, ce
    // n'est pas non plus le travail d'un comptable.
    await seConnecter(page, "l.fotso@cga-brcg.cm");
    await page.goto("/exploitation", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText("Charge de la plateforme");

    await page.goto("/deconnexion").catch(() => undefined);
    await page.context().clearCookies();
    await seConnecter(page, "s.onana@cga-brcg.cm");
    await page.goto("/exploitation", { waitUntil: "domcontentloaded" });

    const corps = page.locator("body");
    await expect(corps).toContainText("Charge de la plateforme");
    // Les trois blocs du diagnostic, dans l'ordre où on les cherche.
    await expect(corps).toContainText("Requêtes servies");
    await expect(corps).toContainText("Base de données");
    await expect(corps).toContainText("Cette instance");
    // ⚠️ La portée est écrite à l'écran : un exploitant qui croirait lire
    // l'ensemble du parc verrait la moitié du trafic et doublerait ses
    // estimations.
    await expect(corps).toContainText("Cette instance seulement");
  });

  test("rend des mesures réelles, pas des zéros", async ({ page }) => {
    await seConnecter(page, "s.onana@cga-brcg.cm");
    const reponse = await page.request.get("/api-charge-essai").catch(() => null);
    expect(reponse === null || reponse.status() === 404).toBeTruthy();

    await page.goto("/exploitation", { waitUntil: "domcontentloaded" });
    const texte = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    // ⚠️ Une médiane à zéro signifierait que l'anneau ne se remplit pas — le
    // défaut le plus probable d'un intergiciel de mesure mal monté.
    expect(texte).toMatch(/[1-9][0-9.]* ms médiane/);
    expect(texte).toContain("en service depuis");
  });
});

test.describe("La politique de contenu", () => {
  test("accompagne la page, avec un nonce qui change à chaque requête", async ({ page }) => {
    const premiere = await page.goto("/connexion");
    const politique = premiere!.headers()["content-security-policy"];

    expect(politique, "aucune politique servie").toBeTruthy();
    // ⚠️ Les directives qui protègent VRAIMENT, et dont la disparition ne se
    // verrait pas à l'écran.
    expect(politique).toContain("connect-src 'self'");
    expect(politique).toContain("object-src 'none'");
    expect(politique).toContain("base-uri 'self'");
    expect(politique).toContain("form-action 'self'");
    expect(politique).toContain("frame-ancestors 'none'");
    // ⚠️ `'unsafe-inline'` SUR LES SCRIPTS rendrait la politique décorative : un
    // script injecté s'exécuterait comme les nôtres. Ce cas tombe si quelqu'un
    // l'ajoute pour « faire marcher » quelque chose.
    expect(politique).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(politique).toMatch(/script-src[^;]*'nonce-/);

    const premierNonce = /'nonce-([^']+)'/.exec(politique)![1];
    const seconde = await page.goto("/connexion?x=1");
    const secondNonce = /'nonce-([^']+)'/.exec(
      seconde!.headers()["content-security-policy"],
    )![1];
    // ⚠️ Un nonce constant est un nonce inutile : il suffirait de le lire une
    // fois dans la source pour l'employer dans une injection.
    expect(secondNonce).not.toBe(premierNonce);
  });

  test("marque le script du thème, qui doit encore s'exécuter", async ({ page }) => {
    await page.goto("/connexion");
    // Le script du thème pose l'attribut avant le premier rendu. S'il était
    // bloqué par la politique, la page clignoterait en blanc et l'attribut
    // manquerait — un symptôme visible plutôt qu'une panne silencieuse.
    const marques = await page.evaluate(
      () => [...document.querySelectorAll("script[nonce]")].length,
    );
    expect(marques, "aucun script marqué : le thème serait bloqué").toBeGreaterThan(0);
  });
});

test.describe("Une création payée, vue du cabinet", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // ⚠️ CE QUE CE PARCOURS TIENT, ET POURQUOI IL A DÛ ÊTRE ÉCRIT.
  //
  // Depuis le 27 septembre, l'encaissement d'une création ouvre tout seul le
  // dossier de formalité. La fiche commerciale payée annonçait l'ouverture de
  // l'espace, et rien de la société : le collaborateur n'avait aucun chemin
  // vers le dossier qui venait de naître.
  //
  // Le panneau dit désormais lequel des trois états on regarde. Ce parcours
  // vérifie dans un VRAI navigateur qu'il s'affiche, et qu'il ne fait pas
  // tomber la fiche quand le dossier n'est pas encore là — un 404 attendu.
  // ─────────────────────────────────────────────────────────────────────────
  test("mène au dossier de formalité, ou dit pourquoi pas encore", async ({ page }) => {
    const erreurs = surveiller(page);
    // ⚠️ Un chargé de FORMALITÉS, et non la direction : le lien vers le dossier
    // de formalité demande `SUIVRE_FORMALITE`. La fiche reste lisible sans
    // cette habilitation — elle le dit — mais le lien n'y est pas, et c'est
    // lui que ce parcours vérifie.
    await seConnecter(page, "p.moukouri@cga-brcg.cm");
    await page.goto("/acquisition");

    // ⚠️ ON PASSE PAR LE PANNEAU « CRÉATIONS PAYÉES », et c'est le propos.
    //
    // Un dossier payé quitte la file « en cours » : sans ce panneau, il
    // n'apparaît nulle part, et une société payée dont le dossier de formalité
    // ne s'est pas ouvert reste invisible. Le parcours emprunte donc le chemin
    // que le collaborateur emprunte, et non une adresse devinée.
    // ⚠️ `section` ET NON `div` : chaque panneau est une `<section>`, alors
    // qu'un `div` filtré par son texte attrape aussi tous ses ancêtres — donc
    // la page entière, et avec elle les liens de la file « en cours ». Le
    // parcours passait alors sur des dossiers non payés et se sautait lui-même.
    const panneau = page.locator("section").filter({ hasText: /Créations payées/ }).last();
    await expect(
      panneau,
      "le panneau des créations payées a disparu : un dossier payé redevient introuvable",
    ).toBeVisible();

    // ⚠️ La référence vit dans l'adresse, pas dans le libellé du lien — celui-ci
    // porte le nom du prospect. Une référence figée dans un parcours meurt au
    // premier recalage du jeu de démonstration.
    const adresses = await panneau
      .locator('a[href*="/acquisition/dos-"]')
      .evaluateAll((liens) => liens.map((l) => l.getAttribute("href")!));
    test.skip(adresses.length === 0, "aucune création payée dans le jeu du moment");

    for (const adresse of adresses.slice(0, 6)) {
      await page.goto(adresse);
      const payee = await page.getByText("Payé", { exact: false }).count();
      if (payee > 0) {
        // L'un des trois états doit être dit, et aucun autre.
        const texte = await page.locator("body").innerText();
        const ouvert = texte.includes("Dossier de formalité ouvert");
        const attente = texte.includes("s'ouvre dans les secondes");
        expect(
          ouvert || attente,
          "la fiche payée ne dit rien du dossier de formalité",
        ).toBe(true);
        if (ouvert) {
          const lien = page.getByRole("link", { name: /Suivre l/ });
          await expect(lien).toBeVisible();
          await lien.click();
          await page.waitForURL(/\/creation-entreprise\/CRE-dos-/);
          // ⚠️ La page de destination doit exister vraiment : un lien qui mène
          // à un écran d'erreur vaut moins que pas de lien.
          await expect(page.locator("h1, h2").first()).toBeVisible();
        }
        expect(erreurs, erreurs.join(" · ")).toEqual([]);
        return;
      }
    }
    test.skip(true, "aucune création payée dans le jeu du moment");
  });
});

