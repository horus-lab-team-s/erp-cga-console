"use client";

/**
 * Le filet, sous les écrans de travail.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UN FILET ALORS QUE CHAQUE ÉCRAN PORTE DÉJÀ SON GARDE
 *
 * Parce qu'un garde par écran se pose à la main, et que ce qui se pose à la main
 * finit par s'oublier. Le prochain écran ajouté n'en aura pas, et le défaut sera
 * le même que celui qu'on vient de corriger : un `403` de l'API remonte, et le
 * visiteur voit « le logiciel est cassé » là où la réponse juste était « ce
 * n'est pas pour vous ».
 *
 * Les deux couches ont des rôles distincts, et il faut les deux :
 *
 * · **le garde d'écran** évite l'appel — il sait *avant* d'interroger l'API que
 *   ce rôle n'y a pas droit, et il peut nommer le profil qui l'ouvrirait ;
 * · **ce filet** rattrape ce que le garde n'a pas prévu, notamment un refus qui
 *   dépend du **dossier** demandé et non du rôle — cas qu'aucune vérification
 *   de permission ne peut anticiper.
 *
 * ⚠️ CE QU'IL NE FAUT PAS FAIRE ICI
 *
 * Afficher `error.message`. Next remplace le message par un identifiant opaque
 * en production, mais l'habitude est mauvaise : le détail d'un refus dit quel
 * dossier existe, et c'est précisément ce que l'API tait en rendant `404`
 * plutôt que `403` sur un dossier hors périmètre.
 *
 * `digest` est en revanche affiché : c'est l'identifiant que Next journalise
 * côté serveur, et le seul moyen pour un utilisateur de désigner *son* incident
 * quand il appelle le cabinet.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function ErreurEcranTravail({
  error,
  reset,
}: {
  error: Error & { digest?: string; statut?: number };
  reset: () => void;
}) {
  // ⚠️ `statut` est porté par `ErreurApi`. Il ne survit **pas** au passage en
  // production, où Next remplace l'erreur par un objet nu — d'où la seconde
  // détection, sur le nom de l'erreur, et le repli prudent : en cas de doute on
  // affiche une panne, jamais un refus. Annoncer « accès refusé » sur une vraie
  // panne enverrait chercher une habilitation au lieu d'un incident.
  const refus = error.statut === 403 || error.statut === 401;

  return (
    <div className="page-travail">
      <div className="page-travail__titre">
        <h1>{refus ? "Accès refusé" : "Cet écran n’a pas pu s’afficher"}</h1>
        <p>{refus ? "Votre session est valide" : "Une erreur est survenue"}</p>
      </div>

      <div className="avertissement-ecran" role="alert">
        {refus ? (
          <span style={{ display: "block" }}>
            <strong style={{ display: "inline", fontWeight: 600 }}>
              Vous n’avez pas l’habilitation nécessaire
            </strong>{" "}
            pour ce que cet écran demande — soit pour l’action, soit pour le
            dossier visé. Rien n’est cassé, et rien n’a été modifié.
          </span>
        ) : (
          <span style={{ display: "block" }}>
            <strong style={{ display: "inline", fontWeight: 600 }}>
              Le chargement a échoué.
            </strong>{" "}
            ⚠️ Si vous étiez en train d’enregistrer quelque chose, vérifiez avant
            de recommencer : l’écran ne sait pas dire si l’enregistrement a
            abouti.
          </span>
        )}

        {error.digest && (
          <span style={{ display: "block" }}>
            Référence à citer au cabinet : <code>{error.digest}</code>
          </span>
        )}
      </div>

      <p>
        <button type="button" className="lien-nav" onClick={reset}>
          Réessayer
        </button>
      </p>
    </div>
  );
}
