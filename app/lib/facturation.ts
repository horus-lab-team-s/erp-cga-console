import { appeler } from "./api";
import type { IdentiteLue } from "./facturation-etats";

/** L'identité fiscale du cabinet, et ce qui manque encore pour émettre une facture. */
export function lireLIdentiteFiscale() {
  return appeler<IdentiteLue>("/souscription/facturation/identite-fiscale", { authentifie: true });
}
