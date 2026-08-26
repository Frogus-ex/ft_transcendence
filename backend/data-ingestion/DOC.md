# Documentation

La partie backend "ingestion" est une pipeline ETL (Extract, Transform, Load) qui va récupérer les données d'une source via la méthode __websocket__ (communication bidirectionnelle en temps réel).
Elle est séparée en 5 parties dans 5 fichiers différents (\_\_init\_\_.py exclus) classées dans l'ordre d'exécution :
- main.py
- parser.py
- dispatcher.py
- redis_client.py
- db_client.py

### main.py
C'est là où tout commence : je récupère l'URL websocket de Binance sur le Bitcoin (BTCUSDT) :

*BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade"*

Ensuite, je vais me connecter au websocket avec *async* (asynchrone), ce qui permet de bosser sur plusieurs tâches en même temps.
J'envoie des pings pour ne pas me faire déconnecter du websocket et je tourne en continu avec *"while True"* dans lequel il va restituer les données brutes envoyées par le websocket. J'ai mis des protections (exception) qui vont attraper l'erreur (connexion fermée ou autres erreurs) puis se reconnecter.
J'envoie ensuite les données "sales" à mon parser qui va le nettoyer.

### parser.py
Cette fonction va parser la donnée brute et la mettre sous format JSON, puis renvoyer un dictionnaire (équivalent d'un std::map **ET** d'un std::unorderedmap en C++ mais avec quelques subtilités comme la structure et la performance) ou rien (None) si le traitement échoue.

### dispatcher.py
C'est à peu près là que tout se joue : on envoie la donnée propre sur le cache Redis (qui va overwrite la dernière donnée, ce qui fait que c'est performant et peu coûteux) et la base de données (Postgres) toutes les **1 seconde**.
**MAIS**, avant d'envoyer vers la base de données, on fait impérativement un dernier nettoyage (pour saturer le moins possible la base de données). Si et seulement si le temps passé est > 1 seconde **ET** que le prix de la donnée précédente n'est pas le même (doublon), on l'enregistre dans la base de données.

### redis_client.py
Avant de commencer, on initialise le client Redis avec les données de l'.env pour pouvoir l'utiliser.
Ici, j'utilise une fonction qui va transformer la date de type *datetime* en type *str*, sinon JSON va gueuler et ne va pas marcher, et après je le mets en cache.

### db_client.py
Bon, je n'ai pas encore fait la database, mais ça arrive ; je suis en train d'apprendre le SQL en profondeur, et j'y bosserai dans quelques jours.

## PostgreSQL
Pour accéder dans le conteneur de PostgreSQL:
- podman exec -it transcendence_db psql -U **POSTGRES_USER** -d **POSTGRES_DB**  

Une fois dedans, tapez **\dt** pour voir toutes les tables.
Vous pouvez ensuite faire des requêtes SQL pour voir les données ou les manipuler (avec précaution, pas de ALTER TABLE, UPDATE ou DELETE).

## Redis
Pour accéder dans le conteneur de Redis:
- podman exec -it transcendence_redis redis-cli [-h **REDIS_HOST** -p **REDIS_PORT** -a **REDIS_PASSWORD**] (pas recommandé pour question de sécurité mais en local okay)  

Si vous vous connectez sans l'authentification dans la commande podman, pour d'identifier:
* AUTH **REDIS_PASSWORD**
Par contre si vous faites la commande **MONITOR** et que vous annulez l'affichage en temps réel (CTRL + C), il faudra vous re-identifier avec la commande ci-dessus.