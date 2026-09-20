"use client";

/**
 * Le dernier filet : il ne se déclenche que si le GABARIT RACINE lui-même
 * échoue.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI IL NE RESSEMBLE À RIEN DU RESTE DU PRODUIT
 *
 * Quand le gabarit racine tombe, il ne rend ni `<html>` ni `<body>` : ce fichier
 * doit donc les rendre lui-même. Il ne peut pas non plus employer les
 * traductions, qui sont fournies par ce gabarit, ni les feuilles de style qu'il
 * charge. Tout est donc écrit ici, en dur et en français, langue du cabinet et
 * de ses adhérents.
 *
 * ⚠️ C'EST VOULU, ET C'EST LA SEULE OPTION HONNÊTE. Importer la marque ou les
 * styles reviendrait à faire dépendre le filet de dernier recours des mêmes
 * mécanismes qui viennent d'échouer. Un filet qui tombe avec ce qu'il rattrape
 * ne sert à rien.
 *
 * Sans ce fichier, le cadre sert sa page interne : « This page couldn't load »,
 * en anglais, avec un numéro d'erreur brut. Mesuré sur la vitrine, qui avait le même trou, avant que les
 * filets n'existent.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#2e1b4d",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <main style={{ maxWidth: 560 }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.08em", opacity: 0.7 }}>
            CGA BROAD RANGE
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: 30, lineHeight: 1.2 }}>
            Le service est momentanément indisponible
          </h1>
          <p style={{ margin: "14px 0 0", lineHeight: 1.6, opacity: 0.85 }}>
            Une panne est survenue de notre côté, et non du vôtre. L&rsquo;incident
            est enregistré. Réessayez dans un instant ; si cela persiste, appelez
            le cabinet.
          </p>
          {error.digest && (
            <p style={{ margin: "14px 0 0", lineHeight: 1.6, opacity: 0.85 }}>
              Référence à citer : <code>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 26,
              padding: "12px 18px",
              borderRadius: 9,
              border: "none",
              background: "#8c2d86",
              color: "#fff",
              font: "600 13px/1.2 inherit",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
