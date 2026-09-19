"use client";

/** Le reçu s'imprime par le navigateur (enregistrer en PDF), comme le rapport mensuel (pas 106). */
export function ImprimerLeRecu() {
  return (
    <button type="button" className="adherent__quitter sans-impression" onClick={() => window.print()}>
      Imprimer ou enregistrer en PDF
    </button>
  );
}
