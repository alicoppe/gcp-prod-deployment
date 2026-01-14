#!/usr/bin/make

include .env

define SERVERS_JSON
{
	"Servers": {
		"1": {
			"Name": "fastapi-alembic",
			"Group": "Servers",
			"Host": "$(DATABASE_HOST)",
			"Port": 5432,
			"MaintenanceDB": "postgres",
			"Username": "$(DATABASE_USER)",
			"SSLMode": "prefer",
			"PassFile": "/tmp/pgpassfile"
		}
	}
}
endef
export SERVERS_JSON

help:
	@echo "make"
	@echo "    install"
	@echo "        Install all packages of the uv project locally."
	@echo "    run-dev-build"
	@echo "        Run development docker compose and force build containers."
	@echo "    run-dev"
	@echo "        Run development docker compose."
	@echo "    run-frontend"
	@echo "        Run frontend only (dev compose)."
	@echo "    run-frontend-build"
	@echo "        Build + run frontend only (dev compose)."
	@echo "    run-backend"
	@echo "        Run backend stack only (API + DB + Redis + Caddy)."
	@echo "    run-backend-build"
	@echo "        Build + run backend stack only (API + DB + Redis + Caddy)."
	@echo "    stop-dev"
	@echo "        Stop development docker compose."
	@echo "    run-prod"
	@echo "        Run production docker compose."
	@echo "    stop-prod"
	@echo "        Run production docker compose."
	@echo "    init-db"
	@echo "        Init database with sample data."	
	@echo "    add-dev-migration"
	@echo "        Add new database migration using alembic."
	@echo "    upgrade-migration"
	@echo "        This helps to upgrade pending migrations."	
	@echo "    run-pgadmin"
	@echo "        Run pgadmin4."	
	@echo "    load-server-pgadmin"
	@echo "        Load server on pgadmin4."
	@echo "    clean-pgadmin"
	@echo "        Clean pgadmin4 data."
	@echo "    formatter"
	@echo "        Apply black formatting to code."
	@echo "    lint"
	@echo "        Lint code with ruff, and check if black formatter should be applied."
	@echo "    lint-watch"
	@echo "        Lint code with ruff in watch mode."
	@echo "    lint-fix"
	@echo "        Lint code with ruff and try to fix."	
	@echo "    run-sonarqube"
	@echo "        Starts Sonarqube container."
	@echo "    run-sonar-scanner"
	@echo "        Starts Sonarqube container."	
	@echo "    stop-sonarqube"
	@echo "        Stops Sonarqube container."

install:
	cd backend/app && \
	uv sync --extra dev

run-dev-build:
	docker compose -f docker-compose-dev.yml up --build

run-dev:
	docker compose -f docker-compose-dev.yml up

run-frontend:
	docker compose -f docker-compose-dev.yml up frontend

run-frontend-build:
	docker compose -f docker-compose-dev.yml up --build frontend

run-backend:
	docker compose -f docker-compose-dev.yml up fastapi_server database redis_server caddy_reverse_proxy

run-backend-build:
	docker compose -f docker-compose-dev.yml up --build fastapi_server database redis_server caddy_reverse_proxy

stop-dev:
	docker compose -f docker-compose-dev.yml down

run-prod:
	docker compose up

stop-prod:
	docker compose down

init-db:
	docker compose -f docker-compose-dev.yml exec fastapi_server python app/initial_data.py && \
	echo "Initial data created." 

formatter:
	cd backend/app && \
	uv run black app

lint:
	cd backend/app && \
	uv run ruff app && uv run black --check app

mypy:
	cd backend/app && \
	uv run mypy .

lint-watch:
	cd backend/app && \
	uv run ruff app --watch

lint-fix:
	cd backend/app && \
	uv run ruff app --fix

run-sonarqube:
	docker compose -f docker-compose-sonarqube.yml up

stop-sonarqube:
	docker compose -f docker-compose-sonarqube.yml down

run-sonar-scanner:
	docker run --rm -v "${PWD}/backend:/usr/src" sonarsource/sonar-scanner-cli -X

add-dev-migration:
	docker compose -f docker-compose-dev.yml exec fastapi_server alembic revision --autogenerate && \
	docker compose -f docker-compose-dev.yml exec fastapi_server alembic upgrade head && \
	echo "Migration added and applied."

upgrade-migration:	
	docker compose -f docker-compose-dev.yml exec fastapi_server alembic upgrade head && \
	echo "Migration upgraded."

run-pgadmin:
	echo "$$SERVERS_JSON" > ./pgadmin/servers.json && \
	docker volume create pgadmin_data && \
	docker compose -f pgadmin.yml up --force-recreate

clean-pgadmin:
	docker volume rm pgadmin_data

run-test:
	docker compose -f docker-compose-test.yml up --build

pytest:
	docker compose -f docker-compose-test.yml exec fastapi_server pytest
