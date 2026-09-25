#!/usr/bin/env bash
set -uo pipefail

# By gwen
# ----------------------
# I wrote this script to stop the data ingestion and celery container properly
# before stopping other container otherwise podman will SIGKILL.
# For "make down" and "make fclean"

RED='\e[31m'
GRN='\e[32m'
YEL='\e[33m'
DEF='\e[0m'

MODE="${1:-down}"

CONTAINERS=("transcendence_ingestion" "transcendence_celery")

echo -e "${YEL}==> Stopping data pipeline services first (${CONTAINERS[0]}, ${CONTAINERS[1]})...${DEF}"
for CONTAINER in "${CONTAINERS[@]}"; do
    if [ "$(podman ps -q -f name=^/${CONTAINER}$)" ]; then
        echo -e "${YEL}Stopping ${CONTAINER} container...${DEF}"
        podman stop -t 30 "$CONTAINER"
        echo -e "${GRN}${CONTAINER} container stopped!${DEF}"
    else
        echo -e "${GRN}Nothing to stop for ${CONTAINER}.${DEF}"
    fi
done

case "$MODE" in
    down)
        echo -e "${YEL}==> Running podman-compose down --remove-orphans${DEF}"
        podman-compose down --remove-orphans
        echo -e "${GRN}==> ✅ Containers stopped, volumes kept.${DEF}"
        ;;
    fclean)
        echo -e "${RED}==> Running podman-compose down -v --remove-orphans${DEF}"
        podman-compose down -v --remove-orphans
	    podman rm -f $(podman ps -aq --filter "name=^transcendence_") 2>/dev/null || true
	    /usr/bin/rm -rf secrets/*.txt secrets/*.json
        echo -e "${GRN}==> ✅ All cleaned: volumes and secrets removed${DEF}"
        ;;
    *)
        echo -e "Usage: $0 [down | fclean]"
        exit 1
        ;;
esac

echo -e "${GRN}==> ✅ Done ($MODE)${DEF}"