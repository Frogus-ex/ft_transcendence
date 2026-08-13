# ft_transcendence :

## Prérequis
- Podman + podman-compose installés (voir https://podman.io/docs/installation)
- Copier `.env.example` vers `.env` et remplir les valeurs

## Lancer le projet

\`\`\`bash
cp .env.example .env
# éditer .env avec de vraies valeurs (voir section Secrets ci-dessous)
podman-compose up -d
podman-compose ps    # vérifier que tout est "healthy"
\`\`\`

## Services

| Service | Rôle | Port |
|---|---|---|
| db | PostgreSQL | 5432 |
| redis | Cache + broker Celery | 6379 |
| data-pipeline | Ingestion websocket Binance | - |

## Générer des secrets

\`\`\`bash
openssl rand -base64 24   # POSTGRES_PASSWORD, REDIS_PASSWORD
openssl rand -hex 32      # JWT_SECRET
\`\`\`

## Commandes utiles

\`\`\`bash
podman-compose logs -f <service>   # suivre les logs d'un service
podman-compose down                # tout arrêter
podman-compose build --no-cache <service>   # rebuild forcé
\`\`\`