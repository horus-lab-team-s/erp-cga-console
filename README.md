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
## Vérifier

```bash
npx tsc --noEmit     # les types
npm run lint         # les conventions
npm test             # 398 cas, en moins de deux secondes
npm run build        # la compilation
```

⚠️ **Ce dépôt n'avait aucun test, et c'était le plus gros trou du projet.** Le serveur en
a 3 814, le téléphone 233 ; ici il n'y avait que `lint` et `build`. Une compilation
réussie dit « le code tient debout » : elle ne lit pas un montant, ne pose pas un témoin,
ne refuse rien. trente écrans reposaient sur une vérification à la main faite une fois.

Ce que le banc garde en priorité, et pourquoi :

| Ce qui est gardé | Le défaut que ça empêche |
| --- | --- |
| `api.ts` | Un refus rendu « 422 Unprocessable Entity » au lieu de « le montant doit être positif ». Tout ce que la console affiche passe par là : un défaut n'y casse pas un écran, il en casse trente |
| `actions-session.ts` | Un témoin `Secure` posé sur une connexion en clair : la connexion réussit, puis la page suivante renvoie à l'écran de connexion. Aucune erreur, aucune trace. Et le message de refus reformulé, qui rouvrirait l'oracle d'énumération que le backend referme |
| `acces.ts` | `dossiers: null` (tout le cabinet) confondu avec `[]` (aucun dossier) : tout le portefeuille montré à qui ne devait rien voir |
| `formats.ts` | Un montant absent affiché « 0 », donc « rien à payer », alors que la vérité est « on ne sait pas » |
| `actions-collecte.ts` | Une photo de plus de 20 Mo refusée par « erreur 413 » au lieu de « photographiez en qualité normale ». Et un canal inventé, qui produirait une ligne inclassable dans les états du cabinet |
| `actions-administration.ts` | Une portée envoyée `[]` en croyant dire « tout le cabinet » : le nouvel arrivant ne voit rien — ou, à l'inverse, voit tout |
| `actions-acquisition.ts` | Un lien de proforma construit sur le domaine de production : le client reçoit une adresse où sa proforma n'existe pas |
| `actions-obligations.ts` | L'heure d'un accusé de dépôt non convertie : un dépôt fait dans les temps consigné hors délai, ou l'inverse — le cabinet croit son client en règle |
| `actions-ecarts.ts` | Un « écart enregistré » qui laisse croire l'anomalie levée alors que le constat compte encore, faute de second regard |
| `actions-portefeuille.ts` | Une admission au Centre sans source de chiffre nommée : l'attestation ne vaut rien devant un contrôle |
| `actions-rapprochement.ts` | Un solde négatif refusé, qui rendrait l'écran inutilisable sur tout compte en découvert. Et un relevé décodé en texte : les libellés en cp1252 deviendraient illisibles |
| `actions-referentiel.ts` | Un taux envoyé en texte au lieu d'un nombre — « 9 » serait alors supérieur à « 19,25 ». Et une expression régulière convertie en nombre, qui ferait accepter n'importe quel NIU |
| `actions-revue.ts` | Un mois « 2026-00 » accepté, qui bornait une revue du 2026-00-01 au 2025-12-31 |
| `actions-social.ts` | Une embauche à moitié faite : le salarié créé, son contrat refusé. Sans le message qui le dit, le gestionnaire recommence tout et se heurte à « matricule déjà pris », qui ressemble à un bogue |
| `actions-creations.ts` | Un identifiant de guichet porté sans sa date : le cabinet ne peut plus dire au fondateur suivant « le RCCM prend trois semaines » |
| `actions-souscription.ts` | Un prix fixé à zéro, qui rendrait la prestation gratuite sans que personne ne l'ait décidé |
| `heure-douala.ts` | Un dépôt fait il y a vingt minutes refusé comme « postérieur à maintenant » : 10:30 à Douala est 09:30 UTC |
| `actions-comptabilite.ts` | Un montant saisi « 1 500,75 » envoyé tel quel : le backend refuse avec une erreur de schéma, et le comptable a pourtant saisi ce qu'on lui a appris à saisir |
| `actions-cloture.ts` | Un premier envoi qui appliquerait au lieu de contrôler. Une clôture ne se rouvre pas |
| `actions-second-facteur.ts` | Une réinitialisation sans motif écrit ni confirmation : c'est le geste qu'un attaquant obtient par téléphone |
| `heure-douala.ts` | « Aujourd'hui » calculé en UTC dans un composant serveur : une heure par jour, la console lit le portefeuille à la mauvaise date |
| `Tableau.tsx` | Une grille différente entre l'en-tête et les lignes : un montant se retrouve sous le libellé « Date », et le comptable lit de travers sans le voir. Employé par presque tous les écrans |
| `FormulaireEcriture.tsx` | Un total qui ignorerait « 1 500,75 » et afficherait « équilibrée » sur une écriture qui ne l'est pas — le pire défaut ici, parce qu'il rassure à tort |
| `ListeConstats.tsx` | Un constat sans sa référence légale : devant un adhérent qui demande « de quel droit ? », le refus devient indéfendable et le cabinet cède |
| `Gravite.tsx` | Une pastille de couleur seule, illisible pour un comptable daltonien et en impression noir et blanc |

⚠️ **Les cas ne remplacent pas un parcours réel dans un navigateur.** Un écran peut être
juste ici et illisible à l'écran. Les deux sont nécessaires ; celui-ci est celui qui
tourne à chaque changement.

## Le parcours réel, dans un vrai navigateur

```bash
docker compose -p cga up -d     # la pile de démonstration
npm run essai-reel              # 9 parcours, en moins de 25 secondes
```

⚠️ **Séparé de `npm test`, et c'est voulu.** Un banc unitaire qui exigerait Docker ne
tournerait ni sur le poste d'un nouveau venu, ni dans la chaîne.

⚠️ **Il emploie le Chrome du poste**, pas celui que l'outil télécharge : 170 Mo en moins,
et surtout le navigateur que le cabinet emploie réellement. Un parcours qui passe sur un
Chromium d'outil et casse sur le Chrome du poste ne sert à rien.

⚠️ **Il n'écrit rien.** Il lit, se connecte, saisit dans les champs et vérifie ce que l'écran calcule, mais n'envoie aucun formulaire d'écriture. Les données d'essai s'accumulent déjà dans la base de démonstration ; ce parcours peut tourner cent fois sans laisser de trace.

Ce qu'il attrape, et que les cas unitaires **ne peuvent pas voir** :

| Ce qui est attrapé | Pourquoi les cas unitaires ne le voient pas |
| --- | --- |
| L'hydratation du formulaire de saisie | Un composant peut rendre juste en DOM simulé et ne jamais s'hydrater en vrai : la page reste figée, et le pied des totaux n'affiche rien |
| Le témoin de session réellement posé | `HttpOnly`, `SameSite`, `Secure` sont vérifiés sur le témoin que Chrome a reçu, pas sur l'objet qu'une doublure a rendu |
| Une page qui répond 200 et n'affiche rien | Un composant serveur qui lève rend exactement cela, et la compilation ne dit rien |
| Les erreurs de console sur dix écrans | Aucune, mesuré. Une seule signifierait de l'hydratation cassée |
| Les en-têtes de sécurité servis | Mesurés sur la réponse du conteneur, et non sur la configuration : c'est la seule façon de voir qu'un en-tête déclaré n'est pas servi |
| Le 404 sur un dossier hors périmètre | Un 403 confirmerait son existence |

⚠️ **Un piège rencontré en l'écrivant** : `networkidle` n'est jamais atteint sur une page
à images paresseuses — le navigateur retient leur requête tant qu'on ne descend pas, et
l'attente expire sur une page parfaitement saine. L'optimiseur, lui, rend ces images en
4 ms. On descend donc la page, ce qui déclenche le chargement paresseux et le vérifie du
même coup.

