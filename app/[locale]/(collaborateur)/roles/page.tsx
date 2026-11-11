import type { Metadata } from "next";

import { MatriceDesRoles as GrilleDesRoles } from "@/app/components/administration/MatriceDesRoles";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { PorteSecondFacteur } from "@/app/components/securite/PorteSecondFacteur";
import { Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { appeler } from "@/app/lib/api";
import type { MatriceDesRoles } from "@/app/lib/matrice-des-roles-etats";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Matrice des rôles · Plateforme CGA" };

/**
 * La matrice des rôles du cabinet (18 octobre 2026).
 *
 * L'administrateur la lit (il invite, il doit savoir ce que le rôle choisi permet) ; le
 * super administrateur la règle, session renforcée. Un réglage vaut pour les sessions
 * ouvertes ensuite : celle d'un collaborateur déjà connecté garde ses droits jusqu'à sa
 * prochaine connexion.
 */
export default async function PageMatriceDesRoles() {
  const acces = await exigerAcces();
  if (!detient(acces, "GERER_ROLES") && !detient(acces, "GERER_COMPTES")) {
    return <EcranReserve titre="Matrice des rôles" permission="GERER_ROLES" acces={acces} />;
  }
  const matrice = await appeler<MatriceDesRoles>("/transverse/matrice-des-roles", { authentifie: true });
  const renforcee = matrice.reglable && acces.facteur_fort;
  const regles = matrice.roles.filter((r) => r.regle).length;
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Matrice des rôles" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Matrice des rôles</h1>
          <p>
            {matrice.roles.length} rôles · {matrice.familles.reduce((n, f) => n + f.droits.length, 0)} droits ·{" "}
            {regles} rôle{regles > 1 ? "s" : ""} réglé{regles > 1 ? "s" : ""} par le cabinet
          </p>
        </div>
        {matrice.reglable && !acces.facteur_fort && (
          <PorteSecondFacteur enrole={acces.second_facteur_enrole} geste="Régler la matrice des rôles" />
        )}
        <Panneau
          titre={renforcee ? "Lire et régler" : "Lire"}
          aide={
            matrice.reglable
              ? "Cliquez sur un rôle pour le régler. Chaque réglage exige un motif et reste au journal d'audit."
              : "Seul le super administrateur règle la matrice."
          }
        >
          <GrilleDesRoles familles={matrice.familles} roles={matrice.roles} reglable={renforcee} />
        </Panneau>
      </div>
    </>
  );
}
