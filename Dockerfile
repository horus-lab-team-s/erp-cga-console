# Front CGA — image de production.
#
# ⚠️ SE CONSTRUIT DEPUIS LA RACINE DU DÉPÔT, PAS DEPUIS CE DOSSIER :
#
#     docker build -f Frontend_erp_cga/Dockerfile -t cga-front .
#
# C'est un workspace pnpm : `pnpm-lock.yaml` et `pnpm-workspace.yaml` sont à la
# racine, et les dépendances réelles vivent dans le `node_modules` hissé du
# parent. Construire depuis ce dossier installerait un arbre différent de celui
# qu'emploient les développeurs — la classe de panne la plus longue à
# diagnostiquer, parce qu'elle ne se reproduit sur aucun poste.
#
# ─────────────────────────────────────────────────────────────────────────────
# TROIS ÉTAGES
#
# `dependances` installe, `construction` compile, `execution` sert. L'étage
# final ne contient ni pnpm, ni les dépendances de développement, ni les
# sources : uniquement la sortie `standalone` du traçage de Next.
#
# ⚠️ LES VARIABLES `NEXT_PUBLIC_*` SONT FIGÉES À LA CONSTRUCTION
#
# Elles sont inscrites dans les paquets JavaScript envoyés au navigateur. Les
# fournir à l'exécution n'a aucun effet — c'est un piège classique, et la raison
# pour laquelle l'adresse de l'API s'appelle ici `API_URL` **sans** ce préfixe :
# elle n'est lue que par le serveur, et reste donc réglable au déploiement.
# ─────────────────────────────────────────────────────────────────────────────

# ── Étage 1 · dépendances ───────────────────────────────────────────────────
FROM node:22-alpine AS dependances
# `corepack` fournit la version de pnpm déclarée par le dépôt, plutôt qu'une
# version quelconque installée globalement. Un gestionnaire de paquets qui n'est
# pas celui du verrou peut résoudre un arbre différent.
RUN corepack enable
WORKDIR /construction

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY Frontend_erp_cga/package.json Frontend_erp_cga/

# ⚠️ Réglages de patience, et ils ne sont pas décoratifs : la première
# construction de cette image a échoué sur un `fetch failed` du registre npm,
# après des requêtes de plus de quatre-vingt-dix secondes. Un déploiement qui
# tombe une fois sur trois pour une raison extérieure au code apprend à l'équipe
# à relancer sans lire, et c'est ainsi qu'un vrai échec passe inaperçu.
#
# La concurrence est **réduite** plutôt qu'augmentée : sur une liaison lente,
# seize requêtes parallèles se volent la bande passante et expirent toutes
# ensemble, là où quatre aboutissent.
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=10000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=300000 \
    npm_config_network_concurrency=4 \
    PNPM_HOME=/pnpm \
    npm_config_store_dir=/pnpm/store

# `--frozen-lockfile` : la construction échoue si le verrou ne correspond pas au
# manifeste, au lieu de le mettre à jour en silence. Une image ne doit jamais
# décider quelle version d'une dépendance elle installe.
#
# ⚠️ Le magasin pnpm est monté en **cache BuildKit**, et ce n'est pas qu'une
# optimisation de vitesse. Sans lui, chaque tentative repart de zéro : sur une
# liaison qui lâche au bout de quelques centaines de paquets, aucune tentative
# n'aboutit jamais, quel que soit le nombre d'essais. Avec lui, chaque essai
# conserve ce qu'il a obtenu et la construction converge.
#
# Le cache ne contient que des archives publiques identifiées par leur
# empreinte — rien de confidentiel, et rien qui puisse dériver du verrou.
# La boucle mérite d'être justifiée, parce qu'une reprise automatique masque
# souvent un vrai défaut. Ici elle ne peut pas : `--frozen-lockfile` rend chaque
# tentative **identique et déterministe**. Une seule cause d'échec varie d'un
# essai à l'autre — le réseau —, et le cache fait que chaque passe reprend là où
# la précédente s'est arrêtée. Trois essais qui échouent tous signalent donc un
# vrai problème, et la construction s'arrête pour de bon.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    for essai in 1 2 3; do \
      pnpm install --frozen-lockfile && exit 0; \
      echo "── Tentative $essai interrompue (réseau). Reprise sur le cache. ──"; \
      sleep 5; \
    done; \
    echo "Trois tentatives d'installation ont échoué." >&2; exit 1

# ── Étage 2 · construction ──────────────────────────────────────────────────
FROM node:22-alpine AS construction
RUN corepack enable
WORKDIR /construction

COPY --from=dependances /construction/node_modules ./node_modules
COPY --from=dependances /construction/Frontend_erp_cga/node_modules ./Frontend_erp_cga/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY Frontend_erp_cga ./Frontend_erp_cga

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter ./Frontend_erp_cga build

# ── Étage 3 · exécution ─────────────────────────────────────────────────────
FROM node:22-alpine AS execution
WORKDIR /application

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# ⚠️ Un utilisateur sans privilège — même raison que côté API.
RUN addgroup --system --gid 1001 cga && adduser --system --uid 1001 cga

# Le traçage de Next reconstruit l'arborescence du workspace : la sortie
# `standalone` porte donc le chemin du projet dans le monorepo.
COPY --from=construction --chown=cga:cga \
     /construction/Frontend_erp_cga/.next/standalone ./
# ⚠️ `standalone` n'emporte **ni** `public/` **ni** `.next/static/` : la
# documentation de Next les suppose servis par un réseau de diffusion. Il n'y en
# a pas ici, et sans ces deux copies l'application se charge sans aucune feuille
# de style — une page nue, sans la moindre erreur au journal.
COPY --from=construction --chown=cga:cga \
     /construction/Frontend_erp_cga/.next/static ./Frontend_erp_cga/.next/static
COPY --from=construction --chown=cga:cga \
     /construction/Frontend_erp_cga/public ./Frontend_erp_cga/public

USER cga
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/fr').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "Frontend_erp_cga/server.js"]
