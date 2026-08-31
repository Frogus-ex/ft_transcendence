.SILENT:

NAME =	ft_transcendence

COLOUR_GREEN = $(shell tput setaf 2)
COLOUR_RED = $(shell tput setaf 1)
COLOUR_YELLOW = $(shell tput setaf 3)
COLOUR_END = $(shell tput sgr0)

COMPOSE = podman-compose

all: setup up

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(COLOUR_GREEN)✅ .env created$(COLOUR_END)"; \
	fi
	@mkdir -p secrets
	@[ -f secrets/postgres_password.txt ]      || openssl rand -base64 24 | tr -d '\n' > secrets/postgres_password.txt
	@[ -f secrets/redis_password.txt ]         || openssl rand -base64 24 | tr -d '\n' > secrets/redis_password.txt
	@[ -f secrets/jwt_secret.txt ]             || openssl rand -hex 32 | tr -d '\n' > secrets/jwt_secret.txt
	@[ -f secrets/grafana_admin_password.txt ] || openssl rand -base64 24 | tr -d '\n' > secrets/grafana_admin_password.txt
	@python3 -c "\
import json; \
pw = open('secrets/redis_password.txt').read().strip(); \
json.dump({'redis://redis:6379': pw}, open('secrets/redis_exporter_password.json', 'w'))"
	@echo "$(COLOUR_GREEN)✅ secrets/ ready$(COLOUR_END)"

up:
	$(COMPOSE) up -d --build
	@echo "$(COLOUR_GREEN)$(NAME) is up$(COLOUR_END)"
	$(COMPOSE) ps

clean:
	$(COMPOSE) down
	@echo "$(COLOUR_YELLOW)containers stopped, volumes kept$(COLOUR_END)"

fclean: clean
	$(COMPOSE) down -v
	@/usr/bin/rm -rf secrets/*.txt secrets/*.json
	@echo "$(COLOUR_RED)all clean: volumes and secrets removed$(COLOUR_END)"

re: fclean all

logs:
	$(COMPOSE) logs -f $(s)

ps:
	$(COMPOSE) ps

.PHONY: all setup up clean fclean re logs ps