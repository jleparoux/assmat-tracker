# AssmatTracker - Makefile
# Commandes simplifiées pour le développement et déploiement

.PHONY: help install dev dev-backend dev-frontend build clean docker-build docker-up docker-down docker-logs test lint format

# Variables
BACKEND_DIR := backend
FRONTEND_DIR := frontend
DATA_DIR := data

# Couleurs pour les messages
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# ================================================
# AIDE ET INFORMATION
# ================================================

help: ## Affiche l'aide des commandes disponibles
	@echo "$(BLUE)🍼 AssmatTracker - Commandes disponibles$(NC)"
	@echo ""
	@echo "$(YELLOW)📋 DÉVELOPPEMENT$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(install|dev|build|clean)"
	@echo ""
	@echo "$(YELLOW)🐳 PRODUCTION (Docker)$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "docker"
	@echo ""
	@echo "$(YELLOW)🔧 QUALITÉ & MAINTENANCE$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $1, $2}' $(MAKEFILE_LIST) | grep -E "(test|lint|format|check|debug)"
	@echo ""
	@echo "$(YELLOW)📖 USAGE RAPIDE$(NC)"
	@echo "  1. $(GREEN)make install$(NC)     # Première installation"
	@echo "  2. $(GREEN)make dev$(NC)         # Lancer frontend + backend"
	@echo "  3. $(GREEN)make docker-up$(NC)   # Production Docker"
	@echo ""
	@echo "$(YELLOW)🆘 PROBLÈMES ?$(NC)"
	@echo "  • $(GREEN)make debug-backend$(NC)  # Si erreurs backend" 
	@echo "  • $(GREEN)make clean install$(NC)  # Si problèmes node_modules"
	@echo "  • $(GREEN)make status$(NC)        # Vérifier l'état du projet"

# ================================================
# INSTALLATION ET SETUP
# ================================================

install: ## Installe toutes les dépendances (backend + frontend)
	@echo "$(BLUE)📦 Installation des dépendances...$(NC)"
	@if [ ! -d "$(BACKEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)📥 Installation backend...$(NC)"; \
		cd $(BACKEND_DIR) && npm install; \
	else \
		echo "$(GREEN)✅ Backend déjà installé$(NC)"; \
	fi
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)📥 Installation frontend...$(NC)"; \
		cd $(FRONTEND_DIR) && npm install; \
	else \
		echo "$(GREEN)✅ Frontend déjà installé$(NC)"; \
	fi
	@echo "$(GREEN)🎉 Installation terminée !$(NC)"

install-backend: ## Installe les dépendances du backend uniquement
	@echo "$(BLUE)📦 Installation backend...$(NC)"
	cd $(BACKEND_DIR) && npm install
	@echo "$(GREEN)✅ Backend installé !$(NC)"

install-frontend: ## Installe les dépendances du frontend uniquement
	@echo "$(BLUE)📦 Installation frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)✅ Frontend installé !$(NC)"

setup-data: ## Crée le dossier data s'il n'existe pas
	@if [ ! -d "$(DATA_DIR)" ]; then \
		echo "$(YELLOW)📁 Création du dossier data...$(NC)"; \
		mkdir -p $(DATA_DIR); \
		echo "$(GREEN)✅ Dossier data créé !$(NC)"; \
	else \
		echo "$(GREEN)✅ Dossier data existe déjà$(NC)"; \
	fi

setup-frontend: ## Crée la structure frontend React si manquante
	@echo "$(BLUE)📁 Configuration de la structure frontend...$(NC)"
	@mkdir -p $(FRONTEND_DIR)/public
	@mkdir -p $(FRONTEND_DIR)/src
	@if [ ! -f "$(FRONTEND_DIR)/public/index.html" ]; then \
		echo "$(YELLOW)📄 Création de index.html...$(NC)"; \
		echo '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>AssmatTracker</title><script src="https://cdn.tailwindcss.com"></script></head><body><div id="root"></div></body></html>' > $(FRONTEND_DIR)/public/index.html; \
	fi
	@if [ ! -f "$(FRONTEND_DIR)/src/index.js" ]; then \
		echo "$(YELLOW)📄 Création de index.js...$(NC)"; \
		echo "import React from 'react'; import ReactDOM from 'react-dom/client'; import './index.css'; import App from './App'; const root = ReactDOM.createRoot(document.getElementById('root')); root.render(<React.StrictMode><App /></React.StrictMode>);" > $(FRONTEND_DIR)/src/index.js; \
	fi
	@if [ ! -f "$(FRONTEND_DIR)/src/index.css" ]; then \
		echo "$(YELLOW)📄 Création de index.css...$(NC)"; \
		echo "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; }" > $(FRONTEND_DIR)/src/index.css; \
	fi
	@echo "$(GREEN)✅ Structure frontend configurée !$(NC)"

setup: setup-data setup-frontend ## Configuration complète du projet
	@echo "$(GREEN)🎉 Configuration terminée !$(NC)"

# ================================================
# DÉVELOPPEMENT LOCAL
# ================================================

dev: setup check-node-modules ## Lance frontend + backend en parallèle (développement)
	@echo "$(BLUE)🚀 Démarrage en mode développement...$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(NC)"
	@echo "$(RED)Ctrl+C pour arrêter$(NC)"
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: check-backend-deps ## Lance uniquement le backend (port 3001)
	@echo "$(BLUE)🔧 Démarrage backend...$(NC)"
	cd $(BACKEND_DIR) && npm run dev

dev-frontend: check-frontend-deps ## Lance uniquement le frontend (port 3000)
	@echo "$(BLUE)⚡ Démarrage frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm start

check-node-modules: ## Vérifie que node_modules existe
	@if [ ! -d "$(BACKEND_DIR)/node_modules" ] || [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)📦 Installation des dépendances manquantes...$(NC)"; \
		$(MAKE) install; \
	fi

check-backend-deps: ## Vérifie les dépendances backend
	@if [ ! -f "$(BACKEND_DIR)/package.json" ]; then \
		echo "$(RED)❌ backend/package.json manquant !$(NC)"; \
		echo "$(YELLOW)💡 Créez ce fichier avec les dépendances Express$(NC)"; \
		exit 1; \
	fi
	@if [ ! -d "$(BACKEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)📦 Installation backend...$(NC)"; \
		cd $(BACKEND_DIR) && npm install; \
	fi

check-frontend-deps: ## Vérifie les dépendances frontend
	@if [ ! -f "$(FRONTEND_DIR)/package.json" ]; then \
		echo "$(RED)❌ frontend/package.json manquant !$(NC)"; \
		echo "$(YELLOW)💡 Créez ce fichier avec les dépendances React$(NC)"; \
		exit 1; \
	fi
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)📦 Installation frontend...$(NC)"; \
		cd $(FRONTEND_DIR) && npm install; \
	fi

start: dev ## Alias pour 'make dev'

# ================================================
# BUILD ET PRODUCTION
# ================================================

build: ## Build le frontend pour la production
	@echo "$(BLUE)🏗️ Build de production...$(NC)"
	cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✅ Build terminé dans frontend/build/$(NC)"

build-backend: ## Vérifie que le backend est prêt
	@echo "$(BLUE)🔍 Vérification backend...$(NC)"
	cd $(BACKEND_DIR) && npm install --production
	@echo "$(GREEN)✅ Backend prêt pour production$(NC)"

# ================================================
# DOCKER (PRODUCTION)
# ================================================

docker-build: ## Build l'image Docker
	@echo "$(BLUE)🐳 Build de l'image Docker...$(NC)"
	docker-compose build
	@echo "$(GREEN)✅ Image Docker construite !$(NC)"

docker-up: ## Lance l'app en production via Docker
	@echo "$(BLUE)🐳 Démarrage Docker...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ AssmatTracker démarré sur http://localhost:3000$(NC)"
	@echo "$(YELLOW)📋 Voir les logs: make docker-logs$(NC)"

docker-down: ## Arrête les containers Docker
	@echo "$(BLUE)🐳 Arrêt des containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Containers arrêtés$(NC)"

docker-restart: docker-down docker-up ## Redémarre les containers Docker

docker-logs: ## Affiche les logs Docker en temps réel
	@echo "$(BLUE)📋 Logs Docker (Ctrl+C pour quitter)...$(NC)"
	docker-compose logs -f

docker-ps: ## Affiche le statut des containers
	@echo "$(BLUE)📊 Statut des containers...$(NC)"
	docker-compose ps

docker-clean: ## Nettoie les images Docker inutilisées
	@echo "$(BLUE)🧹 Nettoyage Docker...$(NC)"
	docker system prune -f
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

# ================================================
# MAINTENANCE ET NETTOYAGE
# ================================================

clean: ## Nettoie les fichiers temporaires et builds
	@echo "$(BLUE)🧹 Nettoyage en cours...$(NC)"
	@if [ -d "$(BACKEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)🗑️ Suppression node_modules backend...$(NC)"; \
		rm -rf $(BACKEND_DIR)/node_modules; \
	fi
	@if [ -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)🗑️ Suppression node_modules frontend...$(NC)"; \
		rm -rf $(FRONTEND_DIR)/node_modules; \
	fi
	@if [ -d "$(FRONTEND_DIR)/build" ]; then \
		echo "$(YELLOW)🗑️ Suppression build frontend...$(NC)"; \
		rm -rf $(FRONTEND_DIR)/build; \
	fi
	@echo "$(GREEN)✅ Nettoyage terminé !$(NC)"

clean-data: ## ⚠️ SUPPRIME TOUTES LES DONNÉES (confirmation requise)
	@echo "$(RED)⚠️ ATTENTION: Cette commande va supprimer TOUTES vos données !$(NC)"
	@echo "$(RED)Tapez 'DELETE' pour confirmer:$(NC)"
	@read confirmation; \
	if [ "$$confirmation" = "DELETE" ]; then \
		echo "$(YELLOW)🗑️ Suppression du dossier data...$(NC)"; \
		rm -rf $(DATA_DIR); \
		echo "$(GREEN)✅ Données supprimées$(NC)"; \
	else \
		echo "$(BLUE)❌ Suppression annulée$(NC)"; \
	fi

reset: clean install setup-data ## Réinitialise complètement le projet

# ================================================
# UTILITAIRES DE DÉVELOPPEMENT
# ================================================

check-deps: ## Vérifie les dépendances manquantes
	@echo "$(BLUE)🔍 Vérification des dépendances...$(NC)"
	@command -v node >/dev/null 2>&1 || (echo "$(RED)❌ Node.js non installé$(NC)" && exit 1)
	@command -v npm >/dev/null 2>&1 || (echo "$(RED)❌ npm non installé$(NC)" && exit 1)
	@command -v docker >/dev/null 2>&1 || echo "$(YELLOW)⚠️ Docker non installé (optionnel pour dev)$(NC)"
	@echo "$(GREEN)✅ Dépendances système OK$(NC)"
	@echo ""
	@echo "$(BLUE)📋 Versions installées:$(NC)"
	@echo "  Node.js: $(node --version)"
	@echo "  npm: $(npm --version)"
	@if command -v docker >/dev/null 2>&1; then echo "  Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"; fi

debug-backend: ## Debug le backend avec informations détaillées
	@echo "$(BLUE)🔍 Debug backend...$(NC)"
	@if [ ! -f "$(BACKEND_DIR)/package.json" ]; then \
		echo "$(RED)❌ backend/package.json manquant !$(NC)"; \
		exit 1; \
	fi
	@if [ ! -d "$(BACKEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)⚠️ node_modules manquant, installation...$(NC)"; \
		cd $(BACKEND_DIR) && npm install; \
	fi
	@echo "$(GREEN)✅ Backend prêt$(NC)"
	@echo "$(YELLOW)🚀 Démarrage avec logs détaillés...$(NC)"
	cd $(BACKEND_DIR) && NODE_ENV=development DEBUG=* npm run dev

debug-frontend: ## Debug le frontend avec informations détaillées  
	@echo "$(BLUE)🔍 Debug frontend...$(NC)"
	@if [ ! -f "$(FRONTEND_DIR)/package.json" ]; then \
		echo "$(RED)❌ frontend/package.json manquant !$(NC)"; \
		exit 1; \
	fi
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(YELLOW)⚠️ node_modules manquant, installation...$(NC)"; \
		cd $(FRONTEND_DIR) && npm install; \
	fi
	@echo "$(GREEN)✅ Frontend prêt$(NC)"
	@echo "$(YELLOW)🚀 Démarrage avec logs détaillés...$(NC)"
	cd $(FRONTEND_DIR) && REACT_APP_DEBUG=true npm start

diagnose: ## Diagnostic complet des problèmes
	@echo "$(BLUE)🔍 Diagnostic complet...$(NC)"
	@echo ""
	@echo "$(YELLOW)📁 STRUCTURE:$(NC)"
	@echo "  Backend: $(if $(wildcard $(BACKEND_DIR)/package.json),$(GREEN)✅ package.json$(NC),$(RED)❌ package.json manquant$(NC))"
	@echo "  Backend: $(if $(wildcard $(BACKEND_DIR)/server.js),$(GREEN)✅ server.js$(NC),$(RED)❌ server.js manquant$(NC))"
	@echo "  Frontend: $(if $(wildcard $(FRONTEND_DIR)/package.json),$(GREEN)✅ package.json$(NC),$(RED)❌ package.json manquant$(NC))"
	@echo "  Frontend: $(if $(wildcard $(FRONTEND_DIR)/public/index.html),$(GREEN)✅ index.html$(NC),$(RED)❌ index.html manquant$(NC))"
	@echo "  Frontend: $(if $(wildcard $(FRONTEND_DIR)/src/index.js),$(GREEN)✅ index.js$(NC),$(RED)❌ index.js manquant$(NC))"
	@echo "  Frontend: $(if $(wildcard $(FRONTEND_DIR)/src/App.js),$(GREEN)✅ App.js$(NC),$(RED)❌ App.js manquant$(NC))"
	@echo "  Data: $(if $(wildcard $(DATA_DIR)),$(GREEN)✅ Dossier data$(NC),$(YELLOW)⚠️ Dossier data absent$(NC))"
	@echo ""
	@echo "$(YELLOW)📦 DÉPENDANCES:$(NC)"
	@echo "  Backend: $(if $(wildcard $(BACKEND_DIR)/node_modules),$(GREEN)✅ Installées$(NC),$(RED)❌ Manquantes$(NC))"
	@echo "  Frontend: $(if $(wildcard $(FRONTEND_DIR)/node_modules),$(GREEN)✅ Installées$(NC),$(RED)❌ Manquantes$(NC))"
	@echo ""
	@echo "$(YELLOW)🛠️ SYSTÈME:$(NC)"
	@echo "  Node.js: $(if $(shell command -v node 2>/dev/null),$(GREEN)✅ $(node --version)$(NC),$(RED)❌ Non installé$(NC))"
	@echo "  npm: $(if $(shell command -v npm 2>/dev/null),$(GREEN)✅ $(npm --version)$(NC),$(RED)❌ Non installé$(NC))"
	@echo "  Docker: $(if $(shell command -v docker 2>/dev/null),$(GREEN)✅ Installé$(NC),$(YELLOW)⚠️ Optionnel$(NC))"
	@echo ""
	@echo "$(YELLOW)💡 ACTIONS RECOMMANDÉES:$(NC)"
	@if [ ! -f "$(FRONTEND_DIR)/public/index.html" ] || [ ! -f "$(FRONTEND_DIR)/src/index.js" ]; then \
		echo "  • $(GREEN)make setup-frontend$(NC) - Créer la structure React"; \
	fi
	@if [ ! -d "$(BACKEND_DIR)/node_modules" ] || [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "  • $(GREEN)make install$(NC) - Installer les dépendances"; \
	fi
	@if [ ! -d "$(DATA_DIR)" ]; then \
		echo "  • $(GREEN)make setup-data$(NC) - Créer le dossier data"; \
	fi
	@echo "  • $(GREEN)make dev$(NC) - Lancer l'application"

status: diagnose ## Alias pour 'make diagnose'

backup-data: ## Crée une sauvegarde du dossier data
	@if [ ! -d "$(DATA_DIR)" ]; then \
		echo "$(RED)❌ Aucune donnée à sauvegarder$(NC)"; \
		exit 1; \
	fi
	@BACKUP_NAME="backup-$$(date +%Y%m%d-%H%M%S)"; \
	echo "$(BLUE)💾 Création de la sauvegarde: $$BACKUP_NAME$(NC)"; \
	cp -r $(DATA_DIR) $$BACKUP_NAME; \
	echo "$(GREEN)✅ Sauvegarde créée: $$BACKUP_NAME$(NC)"

# ================================================
# QUALITÉ ET TESTS
# ================================================

# ================================================
# QUALITÉ ET TESTS
# ================================================

audit: ## Audit de sécurité des dépendances
	@echo "$(BLUE)🔍 Audit de sécurité...$(NC)"
	@echo "$(YELLOW)Backend:$(NC)"
	@cd $(BACKEND_DIR) && npm audit || true
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"  
	@cd $(FRONTEND_DIR) && npm audit || true
	@echo ""
	@echo "$(BLUE)💡 Pour corriger: make security-fix$(NC)"

security-check: ## Vérification sécurité (niveau moderate+)
	@echo "$(BLUE)🛡️ Vérification sécurité...$(NC)"
	@echo "$(YELLOW)Backend:$(NC)"
	@cd $(BACKEND_DIR) && npm audit --audit-level moderate || true
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@cd $(FRONTEND_DIR) && npm audit --audit-level moderate || true

security-fix: ## Correction automatique des vulnérabilités
	@echo "$(BLUE)🔧 Correction des vulnérabilités...$(NC)"
	@echo "$(RED)⚠️ Attention: Cette commande peut casser la compatibilité$(NC)"
	@echo "$(YELLOW)Voulez-vous continuer ? [y/N]$(NC)"
	@read -n 1 -r; \
	if [[ $REPLY =~ ^[Yy]$ ]]; then \
		echo ""; \
		echo "$(YELLOW)🔧 Backend...$(NC)"; \
		cd $(BACKEND_DIR) && npm audit fix; \
		echo ""; \
		echo "$(YELLOW)🔧 Frontend...$(NC)"; \
		cd $(FRONTEND_DIR) && npm audit fix; \
		echo "$(GREEN)✅ Vulnérabilités corrigées !$(NC)"; \
		echo "$(BLUE)💡 Testez avec: make dev$(NC)"; \
	else \
		echo ""; \
		echo "$(BLUE)❌ Correction annulée$(NC)"; \
	fi

security-fix-force: ## ⚠️ Correction forcée (peut casser l'app)
	@echo "$(RED)⚠️ ATTENTION: Correction forcée des vulnérabilités !$(NC)"
	@echo "$(RED)Cela peut introduire des breaking changes !$(NC)"
	@echo "$(YELLOW)Tapez 'FORCE' pour confirmer:$(NC)"
	@read confirmation; \
	if [ "$confirmation" = "FORCE" ]; then \
		echo "$(YELLOW)🔧 Correction forcée...$(NC)"; \
		cd $(BACKEND_DIR) && npm audit fix --force; \
		cd $(FRONTEND_DIR) && npm audit fix --force; \
		echo "$(GREEN)✅ Correction forcée terminée$(NC)"; \
		echo "$(BLUE)💡 TESTEZ IMMÉDIATEMENT: make dev$(NC)"; \
	else \
		echo "$(BLUE)❌ Correction annulée$(NC)"; \
	fi

update-deps: ## Mise à jour des dépendances vers dernières versions
	@echo "$(BLUE)📦 Mise à jour des dépendances...$(NC)"
	@echo "$(YELLOW)Backend:$(NC)"
	@cd $(BACKEND_DIR) && npm update
	@echo "$(YELLOW)Frontend:$(NC)"
	@cd $(FRONTEND_DIR) && npm update
	@echo "$(GREEN)✅ Dépendances mises à jour$(NC)"
	@echo "$(BLUE)💡 Vérifiez: make audit$(NC)"

test: ## Lance les tests (si configurés)
	@echo "$(BLUE)🧪 Lancement des tests...$(NC)"
	@if [ -f "$(BACKEND_DIR)/package.json" ] && grep -q '"test"' $(BACKEND_DIR)/package.json; then \
		echo "$(YELLOW)Testing backend...$(NC)"; \
		cd $(BACKEND_DIR) && npm test; \
	fi
	@if [ -f "$(FRONTEND_DIR)/package.json" ] && grep -q '"test"' $(FRONTEND_DIR)/package.json; then \
		echo "$(YELLOW)Testing frontend...$(NC)"; \
		cd $(FRONTEND_DIR) && npm test -- --watchAll=false; \
	fi

lint: ## Vérifie la qualité du code
	@echo "$(BLUE)🔍 Vérification du code...$(NC)"
	@if [ -f "$(BACKEND_DIR)/package.json" ] && grep -q '"lint"' $(BACKEND_DIR)/package.json; then \
		cd $(BACKEND_DIR) && npm run lint; \
	fi
	@if [ -f "$(FRONTEND_DIR)/package.json" ] && grep -q '"lint"' $(FRONTEND_DIR)/package.json; then \
		cd $(FRONTEND_DIR) && npm run lint; \
	fi

format: ## Formate le code automatiquement
	@echo "$(BLUE)✨ Formatage du code...$(NC)"
	@if [ -f "$(BACKEND_DIR)/package.json" ] && grep -q '"format"' $(BACKEND_DIR)/package.json; then \
		cd $(BACKEND_DIR) && npm run format; \
	fi
	@if [ -f "$(FRONTEND_DIR)/package.json" ] && grep -q '"format"' $(FRONTEND_DIR)/package.json; then \
		cd $(FRONTEND_DIR) && npm run format; \
	fi

# ================================================
# DEFAULT TARGET
# ================================================

.DEFAULT_GOAL := help