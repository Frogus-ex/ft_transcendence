.SILENT:
MAKEFLAGS += --no-print-directory

NAME    = ft_transcendence
COMPOSE = podman-compose
LOG     = .make.log

COLOUR_GREEN  = $(shell tput setaf 2 2>/dev/null)
COLOUR_RED    = $(shell tput setaf 1 2>/dev/null)
COLOUR_YELLOW = $(shell tput setaf 3 2>/dev/null)
COLOUR_END    = $(shell tput sgr0 2>/dev/null)

all: setup up

setup:
	if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(COLOUR_GREEN)✅ .env created$(COLOUR_END)"; \
	fi
	mkdir -p secrets
	[ -f secrets/postgres_admin_password.txt ]    || openssl rand -hex 24 | tr -d '\n' > secrets/postgres_admin_password.txt
	[ -f secrets/postgres_ingest_password.txt ]   || openssl rand -hex 24 | tr -d '\n' > secrets/postgres_ingest_password.txt
	[ -f secrets/postgres_readonly_password.txt ] || openssl rand -hex 24 | tr -d '\n' > secrets/postgres_readonly_password.txt
	[ -f secrets/redis_password.txt ]             || openssl rand -hex 24 | tr -d '\n' > secrets/redis_password.txt
	[ -f secrets/jwt_secret.txt ]                 || openssl rand -hex 32 | tr -d '\n' > secrets/jwt_secret.txt
	[ -f secrets/grafana_admin_password.txt ]     || openssl rand -hex 24 | tr -d '\n' > secrets/grafana_admin_password.txt
	python3 -c "\
	import json; \
	pw = open('secrets/redis_password.txt').read().strip(); \
	json.dump({'redis://redis:6379': pw}, open('secrets/redis_exporter_password.json', 'w'))"
	chmod 644 ./secrets/*.txt ./secrets/*.json
	chmod +x ./backend/data-ingestion/src/bootstrap/postgres/scripts/init.sh
	chmod +x ./stop.sh
	echo "$(COLOUR_GREEN)✅ secrets/ ready$(COLOUR_END)"

up:
	echo "$(COLOUR_YELLOW)⏳ building & starting $(NAME) (details in $(LOG))...$(COLOUR_END)"
	$(COMPOSE) up -d --build > $(LOG) 2>&1; \
	if grep -q '^Error' $(LOG); then \
		echo "$(COLOUR_RED)❌ errors during startup:$(COLOUR_END)"; \
		grep '^Error' $(LOG) | sort -u; \
	fi
	for svc in $$($(COMPOSE) config --services 2>/dev/null); do \
		state=$$(podman ps -a --filter label=com.docker.compose.service=$$svc --format '{{.State}}' | head -n1); \
		if [ "$$state" = "running" ]; then \
			printf "$(COLOUR_GREEN)✅ %s %-22s up$(COLOUR_END)\n" "$(NAME)" "$$svc"; \
		else \
			printf "$(COLOUR_RED)❌ %s %-22s %s$(COLOUR_END)\n" "$(NAME)" "$$svc" "$${state:-missing}"; \
		fi; \
	done
	if grep -q '^Error' $(LOG); then \
		echo "$(COLOUR_RED)⚠️  $(NAME) started with errors, see $(LOG)$(COLOUR_END)"; \
		exit 1; \
	fi
	echo "$(COLOUR_GREEN)🚀 $(NAME) is up$(COLOUR_END)"

down:
	chmod +x ./stop.sh
	./stop.sh down >> $(LOG) 2>&1 \
		&& echo "$(COLOUR_GREEN)✅ $(NAME) stopped$(COLOUR_END)" \
		|| { echo "$(COLOUR_RED)❌ down failed, see $(LOG)$(COLOUR_END)"; exit 1; }

fclean:
	chmod +x ./stop.sh
	./stop.sh fclean >> $(LOG) 2>&1 \
		&& echo "$(COLOUR_GREEN)🧹 $(NAME) fully cleaned$(COLOUR_END)" \
		|| { echo "$(COLOUR_RED)❌ fclean failed, see $(LOG)$(COLOUR_END)"; exit 1; }
	rm -f $(LOG)

re: fclean all

logs:
	$(COMPOSE) logs -f $(s)

fixlog:
	$(COMPOSE) logs $(s)

ps:
	$(COMPOSE) ps

.PHONY: all setup up down fclean re logs ps fixlog