.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help
help: ## Liste des commandes
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-17s\033[0m %s\n", $$1, $$2}'

# --- Installation -----------------------------------------------------------

.PHONY: setup
setup: env ## Dépendances (yarn) et fichier .env
	yarn install --frozen-lockfile

.PHONY: env
env: ## Crée .env depuis .env.example avec un secret JWT généré (ne touche pas à un .env existant)
	@if [ -f .env ]; then \
		echo ".env existe déjà : conservé."; \
	else \
		node -e "const fs = require('fs'); const env = fs.readFileSync('.env.example', 'utf8').replace(/^JWT_SECRET=.*$$/m, 'JWT_SECRET=' + require('crypto').randomUUID()); fs.writeFileSync('.env', env);"; \
		echo ".env créé depuis .env.example (JWT_SECRET généré)."; \
	fi

# --- Stack locale (Docker) --------------------------------------------------

.PHONY: up
up: ## Démarre Postgres, Redis et l'API sur http://localhost:3000, migrations et seed compris
	$(COMPOSE) up -d --build --wait
	$(COMPOSE) exec api yarn migrate:deploy
	$(COMPOSE) exec api yarn seed

.PHONY: down
down: ## Arrête la stack (les données restent dans le volume)
	$(COMPOSE) down

.PHONY: logs
logs: ## Suit les logs de l'API
	$(COMPOSE) logs -f api

.PHONY: migrate
migrate: ## Applique les migrations Drizzle dans le conteneur
	$(COMPOSE) exec api yarn migrate:deploy

.PHONY: seed
seed: ## Parkings gratuits de Reims + communauté fictive (ne fait rien si la base est déjà peuplée)
	$(COMPOSE) exec api yarn seed

.PHONY: db-reset
db-reset: ## Vide les tables et repeuple (signalements frais, compte dev@parkfinder.local)
	$(COMPOSE) exec api yarn seed --reset

# --- Qualité ----------------------------------------------------------------

.PHONY: check
check: ## Comme le job « check » de la CI : format, lint, types, tests unitaires
	npx prettier --check "src/**/*.ts" "test/**/*.ts" "seed/**/*.ts"
	npx eslint "{src,apps,libs,test,seed}/**/*.ts"
	npx tsc --noEmit -p tsconfig.json
	yarn test:unit

.PHONY: test
test: test-unit test-integration ## Tests unitaires puis d'intégration

.PHONY: test-unit
test-unit: ## Tests unitaires
	yarn test:unit

.PHONY: test-integration
test-integration: ## Tests d'intégration sur une base jetable (port 5433), arrêtée ensuite même en cas d'échec
	yarn test:db:up
	yarn test:integration:local; status=$$?; yarn test:db:down; exit $$status
