import { Link } from "@/i18n/navigation";

import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { libelleRole, type Acces, type Permission } from "@/app/lib/acces";
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
      .map((r) => libelleRole(r.role));
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

        {/* 9 novembre 2026 : l'écran était un paragraphe d'excuse sans issue. Une carte
            courte, qui dit qui l'ouvre, et deux portes de sortie. */}
        <section className="ecran-reserve" role="status">
          <span className="ecran-reserve__icone" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <h2 className="ecran-reserve__titre">Cet écran n&rsquo;est pas ouvert à votre rôle</h2>
          <p className="ecran-reserve__texte">
            {profils.length > 0 ? (
              <>
                Il est réservé {profils.length > 1 ? "aux profils" : "au profil"}{" "}
                <strong>
                  {profils.length > 1 ? `${profils.slice(0, -1).join(", ")} et ${profils.at(-1)}` : profils[0]}
                </strong>
                . Pour y accéder, demandez l&rsquo;habilitation à l&rsquo;administrateur du cabinet.
              </>
            ) : (
              <>Pour y accéder, demandez l&rsquo;habilitation à l&rsquo;administrateur du cabinet.</>
            )}
          </p>
          {acces !== null && (
            <p className="ecran-reserve__session">
              Connecté comme {acces.nom_complet} ·{" "}
              {acces.roles.map((r) => libelleRole(r)).join(", ") || "aucun rôle actif à ce jour"}
            </p>
          )}
          <div className="ecran-reserve__actions">
            <Link href="/" className="action-principale">
              Aller à mon accueil
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
