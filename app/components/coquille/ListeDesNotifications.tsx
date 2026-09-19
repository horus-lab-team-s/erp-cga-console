"use client";

import { useActionState } from "react";

import { dateCourte } from "@/app/lib/formats";
import { marquerMesNotificationsLues } from "@/app/lib/actions-notifications";
import type { MesNotifications } from "@/app/lib/notifications";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { Link } from "@/i18n/navigation";

/**
 * La liste des notifications, commune à l'espace de travail et à l'espace adhérent (pas 94).
 *
 * Une non lue se distingue par son **libellé** (« Nouveau ») et non par la seule couleur :
 * c'est la règle d'affichage du projet, qui vaut aussi pour la gravité des constats.
 */
export function ListeDesNotifications({
  lecture,
  espaceAdherent = false,
}: {
  lecture: MesNotifications;
  /**
   * Dans l'espace adhérent, **pas de liens** : ils mènent aux écrans de travail du cabinet
   * (« /obligations »), qui refuseraient l'adhérent. L'avis suffit ; le détail est dans son
   * espace. Et seules les non lues, cinq au plus : ce n'est pas un écran de suivi.
   */
  espaceAdherent?: boolean;
}) {
  const [etat, marquer, enCours] = useActionState(marquerMesNotificationsLues, ETAT_ACTE_INITIAL);
  const petit: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
  const { notifications, non_lues } = lecture;

  if (notifications.length === 0) {
    return (
      <p style={petit}>
        Aucune notification sur les {lecture.fenetre_jours} derniers jours.
        {lecture.source.startsWith("aucun") ? " Aucun abonnement n'est configuré pour ce cabinet." : ""}
      </p>
    );
  }
  const affichees = espaceAdherent ? notifications.filter((n) => !n.lue).slice(0, 5) : notifications;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {non_lues > 0 && (
        <form action={marquer} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="jusqu_au_rang" value={notifications[0].rang} />
          <span style={{ ...petit, color: "var(--ink-900)" }}>
            {non_lues} non lue{non_lues > 1 ? "s" : ""}
          </span>
          <button type="submit" className="bouton-discret" disabled={enCours || Boolean(etat.fait)}>
            {enCours ? "…" : "Tout marquer comme lu"}
          </button>
          {etat.echec && <span role="alert" style={{ ...petit, color: "var(--danger)" }}>{etat.echec}</span>}
          {etat.fait && <span role="status" style={{ ...petit, color: "var(--success)" }}>{etat.fait}</span>}
        </form>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {affichees.map((n) => (
          <li
            key={n.rang}
            style={{
              padding: "8px 12px",
              border: `1px solid ${n.lue ? "var(--line-200)" : "var(--brand-indigo-700)"}`,
              borderRadius: "var(--rayon)",
              background: "var(--surface)",
            }}
          >
            <p style={{ margin: 0, font: "500 13px/1.5 var(--police-texte)", color: "var(--ink-900)" }}>
              {!n.lue && <strong style={{ color: "var(--brand-indigo-700)" }}>Nouveau · </strong>}
              {n.lien && !espaceAdherent ? <Link href={n.lien}>{n.titre}</Link> : n.titre}
            </p>
            <p style={petit}>{n.texte}</p>
            {/* L'horodatage du journal est en UTC : l'heure n'est pas affichée, la date suffit. */}
            <p style={petit}>{dateCourte(n.horodatage)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
