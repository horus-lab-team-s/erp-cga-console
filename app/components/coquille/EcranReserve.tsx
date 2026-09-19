import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { LIBELLES_ROLE, type Acces, type Permission } from "@/app/lib/acces";
import { lireRoles } from "@/app/lib/administration";
import { ErreurApi } from "@/app/lib/api";

/**
 * Ce qu'on affiche à quelqu'un de connecté qui n'a pas le droit d'être là.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CET ÉCRAN EXISTE
 *
 * Sans lui, ces pages **plantaient**. L'écran appelait l'API, l'API répondait
 * `403`, et le composant serveur laissait l'erreur remonter : le visiteur voyait
 * un `500`, c'est-à-dire « le logiciel est cassé » là où la réponse juste était
 * « ce n'est pas pour vous ».
 *
 * La différence n'est pas cosmétique. Un `500` fait appeler le cabinet, ouvrir un
 * incident, chercher une panne qui n'existe pas — et, plus grave, il noie les
 * vrais `500` dans les journaux d'exploitation.
 *
 * Le cas n'est pas théorique : la navigation masque déjà les entrées qu'un rôle ne
 * peut pas ouvrir, mais rien n'empêche un signet, un lien collé dans une
 * conversation, ou un rôle qui a changé depuis hier.
 *
 * POURQUOI ON DIT CE QUI MANQUE, ALORS QUE L'API NE LE DIT JAMAIS
 *
 * L'API tait le détail d'un refus et rend `404` plutôt que `403` sur un dossier
 * hors périmètre : le dire apprendrait à un adhérent quels dossiers le cabinet
 * suit. Ici, rien de tel n'est en jeu. Une **permission** est attachée à un rôle,
 * pas à un dossier : nommer le profil qui ouvre cet écran ne révèle aucune donnée,
 * et évite un appel au support.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Les profils qui détiennent l'une des permissions, lus au catalogue des rôles du backend.
 *
 * ⚠️ PAS 83 : CETTE LISTE ÉTAIT RECOPIÉE À LA MAIN, ET ELLE MENTAIT
 *
 * Elle disait `GERER_COMPTES` ouverte à la direction (seul l'administrateur la détient),
 * `LIRE_COMPTABILITE` fermée au fiscaliste, au chargé de clientèle et à l'inspecteur, et
 * `LIRE_AUDIT` fermée au réviseur. L'écran orientait donc vers la mauvaise personne.
 * La matrice est au backend (`/transverse/roles`, public) : on la lit. Si elle ne se lit
 * pas, l'écran ne nomme aucun profil plutôt que d'en nommer un faux.
 */
async function profilsQuiOuvrent(permissions: Permission[]): Promise<string[]> {
  try {
    const roles = await lireRoles();
    return roles
      .filter((r) => r.role !== "ADHERENT" && permissions.some((p) => r.permissions.includes(p)))
      .map((r) => LIBELLES_ROLE[r.role] ?? r.role);
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return [];
    throw erreur;
  }
}

export async function EcranReserve({
  titre,
  permission,
  ouAussi = [],
  acces,
}: {
  titre: string;
  permission: Permission;
  /** Les autres permissions qui ouvrent aussi l'écran (pas 83 : souscriptions). */
  ouAussi?: Permission[];
  acces: Acces | null;
}) {
  const profils = await profilsQuiOuvrent([permission, ...ouAussi]);

  return (
    <>
      <EnteteTravail miettes={[{ libelle: titre }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>{titre}</h1>
          <p>Accès réservé</p>
        </div>

        <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
          <span style={{ display: "block" }}>
            <strong style={{ display: "inline", fontWeight: 600 }}>
              Cet écran n&rsquo;est pas ouvert à votre rôle.
            </strong>{" "}
            Rien n&rsquo;a échoué : votre session est valide, mais cette page demande
            une habilitation que vous n&rsquo;avez pas.
          </span>
          {profils.length > 0 && (
            <span style={{ display: "block" }}>
              Elle est ouverte {profils.length > 1 ? "aux profils" : "au profil"}{" "}
              <strong style={{ display: "inline", fontWeight: 600 }}>
                {profils.length > 1 ? `${profils.slice(0, -1).join(", ")} et ${profils.at(-1)}` : profils[0]}
              </strong>
              . Si vous devez y accéder, c&rsquo;est une habilitation à demander à
              l&rsquo;administrateur du cabinet — elle est datée, et le journal
              d&rsquo;audit en gardera la trace.
            </span>
          )}
        </div>

        {acces !== null && (
          <p className="faits">
            Connecté comme {acces.nom_complet} ·{" "}
            {acces.roles.map((r) => LIBELLES_ROLE[r] ?? r).join(", ") ||
              "aucun rôle actif à ce jour"}
          </p>
        )}
      </div>
    </>
  );
}
