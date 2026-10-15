*This project has been created as part of the 42 curriculum by tlorette, gwen, aautret, aborel.*

# Description:
## ft_transcendence

This project is a full-stack cryptocurrency paper trading platform inspired by Binance. It recreates the core experience of a real-time trading dashboard on a smaller scale, using live market data from Binance APIs and a simplified interface for monitoring prices, chart trends, and market activity.

The platform is designed to combine:
- real-time market data ingestion;
- historical OHLC candle storage;
- a backend API for chart and watchlist queries;
- WebSocket-based streaming for live updates;
- a persistent PostgreSQL database for structured market history.

# Instructions:

This project requires a working container environment with Make and a compatible runtime such as Docker or Podman. The repository also relies on environment variables and generated secrets stored in the root `secrets` directory.

1. Create a `.env` file at the root of the project using `.env.example` as a template.
2. Set the required PostgreSQL, Redis, and service port values.
3. Generate the secrets needed by the project if they are not already present.
4. Run the following command from the repository root:
   ```bash
   make
   ```
   This command copies `.env.example` to `.env`, generates the required secrets, sets execution permissions, and starts the full project stack.
5. To stop all containers without deleting persistent volumes:
   ```bash
   make down
   ```
6. To reset the environment completely, including volumes and generated secrets:
   ```bash
   make fclean
   ```
7. To rebuild and relaunch the project:
   ```bash
   make re
   ```
8. To inspect the logs of all services in real time:
   ```bash
   make logs
   ```
9. To view a recent log window for the current stack:
   ```bash
   make fixlog
   ```
10. To follow the logs of a specific container:
   ```bash
   podman logs -f <container_name>
   ```
11. To check the status of the running containers:
   ```bash
   make ps
   ```

Example environment file:
```.env
# Postgres Admin
POSTGRES_ADMIN_USER=transcendence_user
POSTGRES_DB=transcendence_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Postgres Ingestion User
POSTGRES_INGEST_USER=ingest_user

# Postgres Read-Only User
POSTGRES_READONLY_USER=reader_user

REDIS_HOST=redis
REDIS_PORT=6379

BACKEND_PORT=8000
FRONTEND_PORT=5173
```

The project expects all required credentials and secrets to be created before startup. Once the environment is configured correctly, the database, Redis cache, ingestion workers, API server, and monitoring stack are started together through the Makefile.

# Resources:

## Data Ingestion & Backend
<u>Python Asyncio & WebSocket</u>:  
https://paths.grasp.study/courses/d8ecc9f1-c1c0-416d-a01d-4bea0ba02a76/modules/253a022d-a57c-4bfc-8239-c450ca8780a7/lessons/4b457195-46c4-49f1-8c6b-640bbacfc2f8  
<u>Binance API</u>:  
https://github.com/binance/binance-spot-api-docs/tree/master  
<u>SQLAlchemy Official Documentation</u>  
https://www.sqlalchemy.org/  
<u>Redis Official Documentation</u>  
https://redis.io/docs/latest/develop/setup/  
<u>Celery Official Documentation</u>  
https://docs.celeryq.dev/en/stable/  
<u>FastAPI Official Documentation</u>  
https://fastapi.tiangolo.com/  
<u>SlowAPI Official Documentation</u>  
https://slowapi.readthedocs.io/en/latest/  
### Usage of AI
AI was used to get a vast explanation of the concepts, a deeper explanations and code structures by providing me reliable sources such as official documentation.  
It was also used to help me debugging and understanding the problems behind.

## Add other ressources for your part
...

# Team Information:
### Assigned Role:
...

### Responsabilities:
*gwen*: Data Ingestion & API Server Backend  
write your responsabilities...

# Project Management:

At the beginning of the project, the team aligned on the core architecture, stack decisions, task allocation, and technical references using Google Docs. This allowed everyone to share a common understanding of the project scope and to define the expected responsibilities before implementation started.

The work was then distributed according to each member's focus area, with a clear separation between ingestion, backend services, and the rest of the platform. GitHub Pull Requests were used to review and validate changes before merging them into the main branch, and GitHub Actions supported part of the validation workflow.

Communication was mainly organized through Discord, which was used for daily coordination, technical discussions, quick troubleshooting, and planning updates. This combination of structured documentation, version-controlled reviews, and frequent discussion helped keep the project organized and consistent throughout development.

# Technical Stack:
## Data Ingestion & API Server Backend
- PostgreSQL: used for reliable persistence of historical OHLC market data and structured queries.
- SQLAlchemy: chosen to manage database access in Python with a clean ORM layer instead of writing raw SQL throughout the application.
- Redis / RedisTimeSeries: used for low-latency live storage, cache management, and time-bucket calculations for real-time market data.
- Celery: used for asynchronous task processing and periodic aggregation jobs without blocking the real-time ingestion flow.
- FastAPI: used for building a lightweight and high-performance REST API layer with strong request validation.
- SlowAPI: used to enforce rate limiting and protect the API from excessive request bursts.

This backend architecture was selected to balance responsiveness, reliability, and maintainability. Redis is ideal for live market updates and fast calculations, while PostgreSQL is better suited for persistent historical records and structured query access. Celery allows time-consuming tasks to be offloaded from the core ingestion path, and FastAPI provides a clean interface for both HTTP and WebSocket-based data delivery.

## Write your part
> The frontend technologies, UI framework, and infrastructure setup still need to be completed by the relevant team members.

# Database Schema:
## Data Ingestion Database

The project uses the `transcendence_db` PostgreSQL database, with the `market_candles` table storing the OHLC market data generated by the ingestion pipeline. This table is populated from the Redis Time Series flow and periodically flushed to PostgreSQL by Celery tasks.

Main fields:
- `symbol`: the cryptocurrency pair, such as `BTCUSDT`;
- `interval`: the time bucket, such as `1m`, `15m`, or `1h`;
- `time`: the timestamp associated with the candle window;
- `open`: the opening price of the period;
- `high`: the highest price reached during the period;
- `low`: the lowest price reached during the period;
- `close`: the closing price of the period;
- `volume`: the traded quantity for that interval.

The table includes:
- a unique constraint on `(symbol, interval, time)` to avoid duplicate candle entries;
- an index on `(symbol, time DESC)` to optimize historical queries;
- an upsert strategy for conflict handling when the same candle would be written again.

Access is split across three PostgreSQL roles:
- Admin: full database privileges, used for schema creation and maintenance.
- Ingest User: restricted to the insert/update operations required by the ingestion service.
- Reader User: read-only access for safe historical queries and inspection.

See [backend/data-ingestion/DOC.md](backend/data-ingestion/DOC.md) for more details.

## Other database or table if you have one
...

# Features List:

- Data Ingestion *(by gwen)*:
  - Connects to the Binance WebSocket streams and retrieves live market events.
  - Validates and normalizes the incoming payloads to keep only the data needed for the platform.
  - Stores latest values in Redis and computes interval-based OHLC candles through RedisTimeSeries.
  - Periodically persists the aggregated data into PostgreSQL for historical access.

- API Server *(by gwen)*:
  - Exposes market and candle data through FastAPI endpoints.
  - Serves historical data from PostgreSQL and live updates from Redis.
  - Broadcasts stream updates to connected clients through WebSocket channels.
  - Applies rate limiting with SlowAPI to control API usage and protect the service.

- Write your part:
  - Frontend features, user-facing dashboards, and additional project components still need to be described by the corresponding team members.

# Modules:
## Feel free to modify the modules organizations and your contribution, I used the Google Docs to write this part
### Frontend Dashboard (3pts)
- IV.1 Minor: Framework Frontend.  
- IV.8 Major: Advanced Analytics Dashboard (UI/UX).  
### Frontend & Backend User Management (10pts)
- IV.1 Major: Allow users to interact with other users (Chat, Friends, Profile).  
- IV.1 Minor: Framework Backend.  
- IV.1 Major: Public API with Rate Limiting.  
- IV.1 Minor: Advanced Search (Filters, Sorting).  
- IV.3 Minor: User Activity Insights Dashboard (UI Integration).  
- IV.3 Minor: OAuth 2.0  
- IV.8 Minor: GDPR Compliance features.  
- IV.3 Minor: 2FA  
### Data Ingestion & API Server (4pts) (gwen)
- IV.8 Minor: Data Export/Import & Bulk operations.  
    - Data Export in JSON, CSV and XML format in the API Server  
    - RedisTimeSeries and optimized SQLAlchemy coding for bulk operations  
- IV.1 Minor: ORM for Database.  
    - SQLAlchemy ORM  
- IV.1 Major: Implement real-time features using WebSockets or similar technology.  
    - Real-time update using WebSocket in API Server and broadcasting  
### Devops (2pts)
- IV.7 Major: Monitoring system with Prometheus and Grafana.  


# Individual Contributions:
### Gwen:
- Real-time market data ingestion
- Data validation and transformation
- RedisTimeSeries for market data processing
- Celery background processing
- PostgreSQL data persistence
- FastAPI backend and WebSockets

Add your own individual contributions to this project  
...

# Old README
## Prérequis
- Copier `.env.example` vers `.env` (section 2)
- Générer les secrets locaux (voir section ci-dessous)

## 1 Secrets

Les mots de passe sensibles (Postgres, Redis, JWT) ne sont pas stockés en clair dans `.env` — ils passent par Docker secrets, sous forme de fichiers dans le dossier `secrets/`, jamais versionnés sur Git.

Avant de lancer le projet, génère tes propres secrets locaux :

```bash
openssl rand -base64 24 | tr -d '\n' > secrets/postgres_admin_password.txt
openssl rand -base64 24 | tr -d '\n' > secrets/postgres_ingest_password.txt
openssl rand -base64 24 | tr -d '\n' > secrets/postgres_readonly_password.txt
openssl rand -base64 24 | tr -d '\n' > secrets/redis_password.txt
openssl rand -hex 32 | tr -d '\n' > secrets/jwt_secret.txt
openssl rand -base64 24 | tr -d '\n' > secrets/grafana_admin_password.txt
#pour generer le mdp du redis exporter au format accepter par celui ci.
python3 -c "import json pw = open('secrets/redis_password.txt').read().strip()
json.dump({'redis://redis:6379': pw}, open('secrets/redis_password.json', 'w'))"
```

⚠️ Ces fichiers sont propres à chaque environnement (dev local, CI, prod) — ne jamais les copier d'une instance à une autre, ni les committer.

HTTPS et certificat

Le service nginx sert de point d'entrée unique en HTTPS — toute connexion HTTP (port 80) est automatiquement redirigée vers HTTPS.

Le certificat utilisé est auto-signé, généré automatiquement au moment du build de l'image (infra/nginx/Dockerfile) — aucune étape manuelle nécessaire. Ton navigateur affichera un avertissement de sécurité à la première connexion (normal pour un certificat auto-signé, à accepter manuellement) : c'est attendu en dev/évaluation locale, un vrai certificat signé par une autorité (Let's Encrypt) nécessiterait un nom de domaine public.

## 2 Lancer le projet

### Automatiquement:

```bash
make [all] / [setup up] # Compile/build tout le projet
make down               # Stoppe les conteneurs sans supprimer les volumes
make fclean             # Stoppe et supprime tous les mots de passe et volumes
make re                 # Recompile tout le projet
make logs               # Affiche les logs des conteneurs en temps réel
make fixlog             # Affiche un log fixe des dernières actions des conteneurs
make ps                 # Affiche l'état des conteneurs
```

### Manuellement
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
podman-compose up -d                        #(specifie ou non le container a lancer)
podman-compose logs -f <service>            # suivre les logs d'un service
podman-compose down                         # tout arrêter (ajoutez -v pour supprimer meme les volumes persistant)
podman-compose build --no-cache <service>   # rebuild forcé
podman-compose ps                           #check les containers en cours
```