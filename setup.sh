#!/bin/bash
# setup.sh — Script d'onboarding pour l'équipe ft_transcendence
#
# Usage :
#   chmod +x setup.sh
#   ./setup.sh

set -e  # arrête le script au premier échec, pour ne pas continuer sur une base cassée

echo "🚀 Setup ft_transcendence"
echo "-------------------------"

# --- 1. Vérifier que Podman est installé ---
if ! command -v podman >/dev/null 2>&1; then
  echo "❌ Podman n'est pas installé."
  echo "   Voir : https://podman.io/docs/installation"
  exit 1
fi
echo "✅ Podman trouvé ($(podman --version))"

# --- 2. Vérifier que podman-compose est installé ---
if ! command -v podman-compose >/dev/null 2>&1; then
  echo "❌ podman-compose n'est pas installé."
  echo "   Installe-le avec : pip install podman-compose"
  exit 1
fi
echo "✅ podman-compose trouvé ($(podman-compose --version 2>&1 | head -n1))"

# --- 3. Silencer l'avertissement "Emulate Docker CLI using podman" ---
if [ ! -f /etc/containers/nodocker ]; then
  echo "ℹ️  Silence l'avertissement Podman (nécessite sudo)..."
fi

# --- 4. Créer le fichier .env s'il n'existe pas ---
if [ ! -f .env ]; then
  if [ ! -f .env.example ]; then
    echo "❌ .env.example introuvable. Impossible de générer .env."
    exit 1
  fi
  cp .env.example .env
  echo "✅ .env créé à partir de .env.example"
  echo ""
  echo "⚠️  IMPORTANT : édite maintenant .env et remplace les valeurs 'changeme' par de vraies valeurs."
  echo "   Génère des secrets forts avec :"
  echo "     openssl rand -base64 24   # pour les mots de passe"
  echo "     openssl rand -hex 32      # pour JWT_SECRET"
else
  echo "ℹ️  .env existe déjà, rien touché."
fi

# --- 5. Récapitulatif ---
echo ""
echo "-------------------------"
echo "✅ Setup terminé."
echo ""
echo "Prochaines étapes :"
echo "  1. Vérifie/complète les valeurs dans .env"
echo "  2. Lance le projet :   podman-compose up -d"
echo "  3. Vérifie le statut : podman-compose ps"
echo "  4. Suis les logs :     podman-compose logs -f <service>"
