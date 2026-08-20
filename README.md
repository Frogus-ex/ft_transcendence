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
openssl rand -base64 24 > secrets/grafana_admin_password.txt
#pour generer le mdp du redis exporter au format accepter par celui ci.
python3 -c "import json pw = open('secrets/redis_password.txt').read().strip()
json.dump({'redis://redis:6379': pw}, open('secrets/redis_password.json', 'w'))"
```

⚠️ Ces fichiers sont propres à chaque environnement (dev local, CI, prod) — ne jamais les copier d'une instance à une autre, ni les committer.

HTTPS et certificat

Le service nginx sert de point d'entrée unique en HTTPS — toute connexion HTTP (port 80) est automatiquement redirigée vers HTTPS.

Le certificat utilisé est auto-signé, généré automatiquement au moment du build de l'image (infra/nginx/Dockerfile) — aucune étape manuelle nécessaire. Ton navigateur affichera un avertissement de sécurité à la première connexion (normal pour un certificat auto-signé, à accepter manuellement) : c'est attendu en dev/évaluation locale, un vrai certificat signé par une autorité (Let's Encrypt) nécessiterait un nom de domaine public.

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