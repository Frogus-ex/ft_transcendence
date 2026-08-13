# ft_transcendence :

## Prérequis
- Copier `.env.example` vers `.env` (section 2)
- Générer les secrets locaux (voir section ci-dessous)

## 1 Secrets

Les mots de passe sensibles (Postgres, Redis, JWT) ne sont pas stockés en clair dans `.env` — ils passent par Docker secrets, sous forme de fichiers dans le dossier `secrets/`, jamais versionnés sur Git.

Avant de lancer le projet, génère tes propres secrets locaux :

```bash
openssl rand -base64 24 > secrets/postgres_password.txt
openssl rand -base64 24 > secrets/redis_password.txt
openssl rand -hex 32 > secrets/jwt_secret.txt
```

⚠️ Ces fichiers sont propres à chaque environnement (dev local, CI, prod) — ne jamais les copier d'une instance à une autre, ni les committer.

## 2 Lancer le projet

```bash
cp .env.example .env
# éditer .env avec de vraies valeurs (voir section Secrets ci-dessous)
podman-compose up -d
podman-compose ps    # vérifier que tout est "healthy"
```

## Services

| Service | Rôle | Port |
|---|---|---|
| db | PostgreSQL | 5432 |
| redis | Cache + broker Celery | 6379 |
| data-pipeline | Ingestion websocket Binance | - |

## Commandes utiles

```bash
podman-compose up -d #(specifie ou non le container a lancer)
podman-compose logs -f <service>   # suivre les logs d'un service
podman-compose down                # tout arrêter (ajoutez -v pour supprimer meme les volumes persistant)
podman-compose build --no-cache <service>   # rebuild forcé
podman-compose ps #check les containers en cours
```