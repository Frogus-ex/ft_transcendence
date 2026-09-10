# Contrat API — Proposition

**ft_transcendence · Real-Time Trading Simulator — Dashboard de trading**
Rédigé par le Front Lead · brouillon de travail à discuter en équipe

Ce document propose une première version des échanges entre le frontend (dashboard de trading) et les deux services backend du projet : le pipeline de données de marché (**Data**) et l'API applicative (**Back Web** — authentification, ordres, portefeuille). Aucun de ces deux services n'expose encore d'API aujourd'hui : ce brouillon sert de base de discussion, pas de spécification figée.

Les points marqués **⚠️ à trancher** sont ceux qui ont besoin d'un accord explicite avant implémentation.

---

## Conventions générales

- Toutes les routes applicatives sous le préfixe `/api/`.
- HTTPS uniquement pour toute connexion externe au backend (imposé par le sujet).
- Authentification via l'en-tête `Authorization: Bearer <token>` une fois l'utilisateur connecté.
- Format d'erreur unique proposé : `{ "error": { "code": "...", "message": "..." } }` ⚠️ **à trancher**
- Nature du token (JWT signé, session opaque, durée de vie, refresh) ⚠️ **à trancher avec Back Web**

---

## Marché — `[DATA]`

Prix, historique de bougies, watchlist.

| Route | Requête | Réponse | Notes |
|---|---|---|---|
| `GET /api/markets` | — | `[{ symbol, name, lastPrice, change24h }]` | Liste des actifs pour la watchlist ⚠️ **à trancher** |
| `GET /api/markets/{symbol}/candles` | query: `interval` (1m/5m/1h/1D), `limit` | `[{ time, open, high, low, close, volume }]` | Alimente le graphique en chandelier |
| `WS /ws/markets/{symbol}` | connexion ouverte | `{ symbol, price, timestamp }` à chaque tick | Alternative : polling REST si le WS n'est pas prêt à temps ⚠️ **à trancher** |

---

## Comptes utilisateurs — `[BACK WEB]`

Authentification.

| Route | Requête | Réponse | Notes |
|---|---|---|---|
| `POST /api/auth/register` | `{ email, username, password }` | `{ userId }` | — |
| `POST /api/auth/login` | `{ email, password }` | `{ token, user: { id, username, avatarUrl } }` | Type de token ⚠️ **à trancher** |
| `GET /api/users/me` | en-tête `Authorization` | `{ id, username, email, avatarUrl, createdAt }` | Pour le header et la page profil |

---

## Trading — `[BACK WEB]`

Ordres et positions.

| Route | Requête | Réponse | Notes |
|---|---|---|---|
| `POST /api/orders` | `{ symbol, side: "buy"\|"sell", type: "market"\|"limit", quantity, limitPrice?, stopLoss?, takeProfit? }` | `{ orderId, status, executedPrice?, timestamp }` | Cœur du ticket d'ordre |
| `DELETE /api/orders/{orderId}` | — | `{ orderId, status: "cancelled" }` | Annule un ordre Limit en attente |
| `POST /api/positions/{id}/close` | — | `{ positionId, status: "closed", pnl }` | Bouton d'urgence Close |
| `GET /api/orders` | query: `from`, `to` | `[{ id, symbol, side, type, quantity, price, status, timestamp }]` | Historique, alimente Analytics et l'export |

### Portefeuille et analytics — `[BACK WEB]`

| Route | Requête | Réponse | Notes |
|---|---|---|---|
| `GET /api/portfolio` | — | `{ balance, equity, positions: [{ symbol, quantity, entryPrice, currentValue, unrealizedPnl }] }` | Panneau positions |
| `GET /api/stats` | query: `from`, `to` | `{ realizedPnl, unrealizedPnl, winRate, totalTrades }` | Répartition Back Web / Data pour le calcul ⚠️ **à trancher** |
| `GET /api/stats/export` | query: `format` (csv/pdf), `from`, `to` | fichier téléchargeable | Génération côté client ou serveur ? ⚠️ **à trancher** |

---

## Conformité — `[BACK WEB]`

RGPD / GDPR.

| Route | Requête | Réponse | Notes |
|---|---|---|---|
| `POST /api/gdpr/export-request` | — | `{ requestId, status: "pending" }` | Traitement réel côté Back Web / Data |
| `POST /api/gdpr/delete-request` | — | `{ requestId, status: "pending" }` | Prévoir une confirmation explicite côté UI |

---

## Prochaine étape

Qu'on discute ensemble des points marqués ⚠️ **à trancher**, puis qu'on verse la version corrigée ici, dans ce même fichier, pour que tout le monde s'y réfère au lieu de se fier à sa mémoire.
