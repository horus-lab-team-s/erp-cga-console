/**
 * Ce que la loi impose au Centre lui-même (CGI 2026, art. 118 et 119), 10 novembre 2026.
 *
 * Les obligations des adhérents sont suivies partout ailleurs ; celles du PROMOTEUR ne
 * l'étaient nulle part. Chaque ligne cite son article, dit l'état au jour, et ce qu'il y a à
 * faire. Rien n'est inventé : les professionnels sont ceux que le cabinet a déclarés au
 * référentiel, et les fourchettes ne sont comparées à aucun prix qui ne serait pas une
 * cotisation (voir le domaine, côté serveur).
 */
import { EtatErreur, Panneau } from "@/app/components/Tableau";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { lireLaConformiteDuCentre, type ConformiteDuCentre as Conformite, type Fourchette } from "@/app/lib/pilotage";

export async function ConformiteDuCentre() {
  let c: Conformite | null = null;
  let erreur: string | null = null;
  try {
    c = await lireLaConformiteDuCentre();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : "lecture impossible";
  }
  return (
    <Panneau
      titre="Conformité du centre"
      aide="Ce que le Code général des impôts impose au promoteur lui-même (art. 118 et 119)"
      action={
        <a className="action-secondaire" href="/api/pilotage/liste-des-adherents" download>
          Liste des adhérents (Excel)
        </a>
      }
    >
      {erreur || !c ? (
        <EtatErreur titre="La conformité ne se lit pas" detail={erreur ?? ""} />
      ) : (
        <div className="conformite-centre">
          <Ligne
            article="Art. 119 (4)"
            titre="Liste à jour des adhérents"
            etat="ok"
            valeur={`${c.adherents_actifs} adhérent${c.adherents_actifs > 1 ? "s" : ""} actif${c.adherents_actifs > 1 ? "s" : ""}`}
            detail="À annexer à chaque déclaration mensuelle du centre : le bouton ci-dessus la produit au jour."
          />
          <Ligne
            article="Art. 119 (3)"
            titre="Seuil des adhérents actifs"
            etat={c.seuil_atteint ? "ok" : "info"}
            valeur={`${c.adherents_actifs} / ${c.seuil_adherents_actifs}`}
            detail={
              c.seuil_atteint
                ? "Atteint : abattement de 50 % sur les revenus tirés du CGA, et exemption des charges sur les salaires du personnel du centre."
                : `Encore ${c.manque_pour_le_seuil} adhérent${c.manque_pour_le_seuil > 1 ? "s" : ""} pour ouvrir au promoteur l'abattement de 50 % et l'exemption des charges sur salaires. Compte : les adhésions en cours au ${dateCourte(c.a_la_date)}.`
            }
          />
          <Ligne
            article="Art. 118 (5)"
            titre="Professionnels du centre"
            etat={c.professionnels_conformes ? "ok" : "alerte"}
            valeur={`${c.conseils_fiscaux.length} conseil fiscal · ${c.experts_comptables.length} expert-comptable · ${c.professionnels_requis} requis de chaque`}
            detail={
              c.professionnels_conformes
                ? [...c.conseils_fiscaux, ...c.experts_comptables].map((p) => `${p.nom} (${p.inscription})`).join(" · ")
                : "Au moins un conseil fiscal et un expert-comptable inscrit à l'ordre, un par tranche de 2 000 adhérents, sous peine de suspension de l'agrément. À déclarer au référentiel (cabinet/conformite_du_centre.yaml)."
            }
          />
          <Ligne
            article="Art. 118 (3) et (4)"
            titre="Droits d'adhésion et cotisations"
            etat="info"
            valeur={`Adhésion ${fourchette(c.droits_d_adhesion)} · cotisation IGS ${fourchette(c.cotisation_igs)} · réel ${fourchette(c.cotisation_reel)}`}
            detail="Fourchettes annuelles légales. Le prix mensuel du suivi comptable couvre aussi la tenue des comptes et la DSF : il ne se compare pas tel quel. Le cabinet arrête quelle part constitue la cotisation."
          />
        </div>
      )}
    </Panneau>
  );
}

function fourchette(f: Fourchette): string {
  return `${montantFcfa(f.minimum)} à ${montantFcfa(f.maximum)}`;
}

function Ligne({
  article,
  titre,
  etat,
  valeur,
  detail,
}: {
  article: string;
  titre: string;
  etat: "ok" | "info" | "alerte";
  valeur: string;
  detail: string;
}) {
  const libelles = { ok: "Conforme", info: "À suivre", alerte: "À régulariser" };
  return (
    <div className="conformite-centre__ligne">
      <span className={`conformite-centre__etat conformite-centre__etat--${etat}`}>{libelles[etat]}</span>
      <div className="conformite-centre__corps">
        <p className="conformite-centre__titre">
          {titre} <span className="conformite-centre__article">{article}</span>
        </p>
        <p className="conformite-centre__valeur">{valeur}</p>
        <p className="conformite-centre__detail">{detail}</p>
      </div>
    </div>
  );
}
