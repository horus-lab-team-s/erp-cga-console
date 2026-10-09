import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Ce qui est vrai avant chaque cas.
 *
 * ⚠️ `cleanup` DÉMONTE CE QUE LE CAS PRÉCÉDENT A RENDU. Sans lui, deux cas qui
 * rendent le même composant laissent DEUX exemplaires dans le document, et
 * `getByText` échoue sur « plusieurs éléments trouvés » — un message qui accuse
 * le composant alors que c'est le cas d'avant qui traîne.
 *
 * ⚠️ `restoreAllMocks` REMET `fetch` ET LES AUTRES DOUBLURES EN PLACE. Un cas
 * qui remplace `fetch` et oublie de le rendre contamine tous les suivants, et le
 * défaut se manifeste dans un AUTRE fichier : on cherche des heures au mauvais
 * endroit.
 */
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
