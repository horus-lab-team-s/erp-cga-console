import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { LIBELLES_COURRIEL, lireCourriels } from "@/app/lib/recette";
import { Link } from "@/i18n/navigation";
import "@/app/styles/vitrine.css";

/**
 * ⚠️ Jamais pré-rendue. Sans cela, la compilation interroge l'API — qui ne tourne
 * pas au moment du `build` — et la page échoue à s'exporter. Plus fondamentalement,
 * une boîte aux lettres figée à la compilation n'aurait aucun sens : elle
 * afficherait éternellement l'état d'un instant révolu.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Courriels de recette — CGA",
  // ⚠️ Cette page affiche des liens d'activation en clair. Aucun moteur ne doit
  // la connaître, même si elle n'existe qu'en mode démonstration.
  robots: { index: false, follow: false },
};

/**
 * La boîte aux lettres du mode démonstration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * À QUOI ELLE SERT, ET POURQUOI ELLE EST INDISPENSABLE À LA RECETTE
 *
 * En développement, les courriels sont **retenus** au lieu d'être envoyés :
 * c'est ce qui empêche une suite de tests d'écrire à de vraies adresses. Mais
 * personne ne pouvait les lire, et le lien d'activation — le seul chemin vers
 * l'espace d'un nouvel adhérent — disparaissait donc dans un tableau en mémoire.
 *
 * Résultat : le parcours complet n'avait jamais été parcouru, et la page
 * d'activation n'existait tout simplement pas. Un 404 au bout d'un paiement.
 *
 * ⚠️ ELLE N'EST PAS PROTÉGÉE PAR UNE SESSION, ET C'EST ASSUMÉ
 *
 * Exiger une connexion serait absurde : on vient précisément y chercher de quoi
 * se connecter la première fois. La protection est ailleurs, et elle est plus
 * solide qu'un contrôle d'accès — **la route n'existe pas** hors du mode
 * démonstration, que la production refuse au démarrage.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Courriels({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await lireCourriels();

  const carte: React.CSSProperties = {
    border: "1px solid var(--line-200)",
    borderRadius: 10,
    padding: "16px 18px",
    background: "var(--surface)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  return (
    <main className="bloc" style={{ padding: "48px 0 64px", maxWidth: 860 }}>
      <Link href="/" className="lien-nav">
        ← Retour au site
      </Link>

      <h1 style={{ font: "600 26px/1.25 var(--police-titre)", margin: "16px 0 6px" }}>
        Courriels de recette
      </h1>

      {messages === null ? (
        <div className="avertissement-ecran" role="status">
          <span style={{ display: "block" }}>
            <strong style={{ display: "inline", fontWeight: 600 }}>
              Le mode démonstration n’est pas actif.
            </strong>{" "}
            Cette page n’a rien à montrer : soit les courriels partent vraiment,
            soit le drapeau n’est pas posé.
          </span>
          <span style={{ display: "block" }}>
            Pour l’activer : <code>CGA_MODE_DEMONSTRATION=true</code> côté API,
            puis redémarrer. ⚠️ La production refuse de démarrer avec ce drapeau.
          </span>
        </div>
      ) : (
        <>
          <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
            <span style={{ display: "block" }}>
              <strong style={{ display: "inline", fontWeight: 600 }}>
                Aucun de ces messages n’est parti.
              </strong>{" "}
              Ils sont retenus en mémoire, et se perdent au redémarrage de l’API.
            </span>
            <span style={{ display: "block" }}>
              ⚠️ Les liens ci-dessous sont des <strong>secrets d’usage unique</strong> :
              les ouvrir consomme le jeton.
            </span>
          </div>

          <p style={{ font: "400 13px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
            {messages.length} message{messages.length > 1 ? "s" : ""} · du plus récent
            au plus ancien
          </p>

          {messages.length === 0 ? (
            <p>
              Aucun message pour l’instant. Faites une souscription depuis{" "}
              <Link href="/estimation" style={{ textDecoration: "underline" }}>
                l’estimation
              </Link>{" "}
              : le paiement se valide seul en mode démonstration, et le courriel
              d’activation apparaîtra ici.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m, i) => {
                const lien = typeof m.contexte.lien === "string" ? m.contexte.lien : null;
                return (
                  <div key={`${m.code}-${i}`} style={carte}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{LIBELLES_COURRIEL[m.code] ?? m.code}</strong>
                      <code style={{ color: "var(--ink-500)", fontSize: 12 }}>{m.code}</code>
                    </div>
                    <span style={{ color: "var(--ink-500)", fontSize: 13 }}>
                      À {m.destinataire}
                    </span>

                    {lien && (
                      <a
                        href={lien}
                        className="bouton bouton--principal"
                        style={{ alignSelf: "flex-start" }}
                      >
                        Ouvrir le lien
                      </a>
                    )}

                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 13 }}>
                        Contexte transmis au gabarit
                      </summary>
                      <pre
                        style={{
                          overflowX: "auto",
                          fontSize: 12,
                          background: "var(--surface-alt)",
                          padding: 10,
                          borderRadius: 6,
                        }}
                      >
                        {JSON.stringify(m.contexte, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
