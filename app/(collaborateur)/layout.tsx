import type { ReactNode } from "react";

import { Coquille } from "../components/coquille/Coquille";
import "../styles/coquille.css";

/**
 * E00 · Coquille de l'espace collaborateur.
 *
 * Le groupe de routes `(collaborateur)` n'apparaît pas dans l'URL : il sert à
 * distinguer les écrans du cabinet, denses et clavier, de ceux de l'espace
 * adhérent, tactiles et à cible de 44 px — qui vivront dans `(adherent)` et
 * porteront `data-espace="adherent"`.
 */
export default function LayoutCollaborateur({ children }: { children: ReactNode }) {
  return <Coquille>{children}</Coquille>;
}
