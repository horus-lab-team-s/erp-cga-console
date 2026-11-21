"use client";

import { useState, type CSSProperties, type InputHTMLAttributes } from "react";

/**
 * Un champ de mot de passe qu'on peut afficher (9 novembre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * « Identifiants refusés » sans pouvoir relire ce qu'on a tapé : une majuscule
 * posée par le clavier du téléphone, une espace en trop, et l'utilisateur
 * recommence à l'aveugle jusqu'au limiteur de tentatives. L'œil montre la saisie.
 *
 * ⚠️ Le champ redevient masqué à chaque envoi du formulaire : un mot de passe ne
 * reste pas affiché à l'écran après la connexion ou un refus.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ChampMotDePasse({
  style,
  ...attributs
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { style?: CSSProperties }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: "relative", display: "block" }}>
      <input
        {...attributs}
        type={visible ? "text" : "password"}
        // Pas de correction ni de majuscule automatiques quand le texte est visible.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        style={{ ...style, paddingRight: 46 }}
        ref={(champ) => {
          const formulaire = champ?.form;
          if (!formulaire || formulaire.dataset.masqueALEnvoi) return;
          formulaire.dataset.masqueALEnvoi = "1";
          formulaire.addEventListener("submit", () => setVisible(false));
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        aria-controls={attributs.id}
        title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        style={{
          position: "absolute",
          top: "50%",
          right: 6,
          transform: "translateY(-50%)",
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          padding: 0,
          border: 0,
          borderRadius: 8,
          background: "transparent",
          // La couleur du texte du champ (blanc sur le panneau sombre de la connexion).
          color: style?.color ?? "inherit",
          cursor: "pointer",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </span>
  );
}
