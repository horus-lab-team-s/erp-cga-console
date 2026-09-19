# Console CGA Broad Range

Le poste de travail du cabinet et l'espace de l'adhérent : la boîte de réception des
pièces, le rapport de conformité, la comptabilité, les déclarations, la paie, la clôture,
le pilotage de la direction, et les sept écrans que l'adhérent ouvre depuis son espace.

Conception et réalisation : **TCHAMBA TCHAKOUNTE Edwin**, ingénieur informaticien.

## Ce que ce dépôt porte, et ce qu'il ne porte pas

| Ici | Ailleurs |
| --- | --- |
| La console du cabinet et l'espace adhérent | Le site public : dépôt `erp-cga-vitrine` |
| Les composants et la bibliothèque de l'interface | Les routes qu'elle appelle : dépôt `erp-cga-backend` |
| Les catalogues de messages `commun`, `pages` et `erp` | Le document de conception et la recette : dépôt `erp-cga-plateforme` |

## Le noyau partagé avec la vitrine, et ce qu'il coûte

Huit modules sont **communs** à ce dépôt et à `erp-cga-vitrine` : le client HTTP, les
formats, la saisie, les préférences, la session et les gestes d'acquisition. À la scission,
la décision a été de les **recopier** plutôt que de les publier en paquet.

⚠️ **Le coût est connu et assumé : ces copies dérivent.** Le jour où le client HTTP change
d'un côté, rien ne le signale de l'autre. Deux garde-fous, et aucun n'est automatique :
toute correction du noyau se reporte dans les deux dépôts le jour même, et le fichier
concerné porte en tête la mention du dépôt jumeau. Le jour où cette discipline coûtera plus
cher qu'un paquet publié se reconnaîtra à un symptôme : un défaut corrigé deux fois.

## ⚠️ Ce que la scission a déplacé, et qui doit être surveillé

Trois outils du dépôt backend mesuraient l'invariant du projet, « tout ce que le serveur
permet est à l'écran », en lisant **ce dossier** :

* `couverture_des_ecrans` : les routes montées qu'aucun écran n'appelle ;
* `contrat_des_ecrans` : les appels d'écran qui ne correspondent à aucune route ;
* `avancement_des_ecrans` : la grille des gestes.

Ils lisent désormais un chemin réglable, et il faut leur donner une copie de ce dépôt. Ce
sont eux qui ont trouvé, au pas 129, trois routes livrées sans écran. Les laisser aveugles
serait perdre le seul contrôle qui compare le serveur et l'interface.

## Démarrer

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

Le backend doit tourner : sans lui, les écrans rendent le refus du client HTTP, ce qui est
le comportement voulu et non une panne.
