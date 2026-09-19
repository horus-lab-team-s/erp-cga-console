import { Link } from "@/i18n/navigation";

/**
 * La barre d'onglets de l'espace adhérent (pas 112), en bas de l'écran du téléphone.
 *
 * La maquette en porte cinq : Accueil, Justificatifs, Échéances, Documents, Entreprise. **Seuls les
 * écrans construits ont un onglet** : un onglet qui ouvrirait une page vide ou « bientôt » ferait
 * croire à une panne. Pas 113 : « Échéances » rejoint les onglets. Pas 114 : « Documents » et
 * « Entreprise » : les cinq onglets de la maquette sont là.
 */
const ONGLETS = [
  { cle: "accueil", libelle: "Accueil", lien: "/mon-espace" },
  { cle: "justificatifs", libelle: "Justificatifs", lien: "/mon-espace/justificatifs" },
  { cle: "echeances", libelle: "Échéances", lien: "/mon-espace/echeances" },
  { cle: "documents", libelle: "Documents", lien: "/mon-espace/documents" },
  { cle: "entreprise", libelle: "Entreprise", lien: "/mon-espace/entreprise" },
] as const;

/** `actif` absent : une page hors des onglets (les réglages), aucun onglet n'est désigné. */
export function OngletsAdherent({ actif }: { actif?: (typeof ONGLETS)[number]["cle"] }) {
  return (
    <nav className="adherent__onglets sans-impression" aria-label="Espace adhérent">
      {ONGLETS.map((o) => (
        <Link key={o.cle} href={o.lien} aria-current={o.cle === actif ? "page" : undefined}>
          {o.libelle}
        </Link>
      ))}
    </nav>
  );
}
