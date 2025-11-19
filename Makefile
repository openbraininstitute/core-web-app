.PHONY: build run stop clean

COMMIT_SHA := $(shell git rev-parse --short=8 HEAD)
APP_VERSION := $(shell git describe --tags --always --dirty)


COMPOSE_FILE := docker-compose.yml


all: build

build:
	@echo "Building image with commit SHA: $(COMMIT_SHA)"
	COMMIT_SHA=$(COMMIT_SHA) docker compose -f $(COMPOSE_FILE) build


run:
	@echo "Starting container with commit SHA: $(COMMIT_SHA)"
	COMMIT_SHA=$(COMMIT_SHA) docker compose -f $(COMPOSE_FILE) up

run-detached:
	@echo "Starting container in detached mode with commit SHA: $(COMMIT_SHA)"
	COMMIT_SHA=$(COMMIT_SHA) docker compose -f $(COMPOSE_FILE) up -d

stop:
	docker compose -f $(COMPOSE_FILE) down

clean:
	docker compose -f $(COMPOSE_FILE) down --rmi local --volumes --remove-orphans

version:
	@echo "Current commit SHA: $(COMMIT_SHA)"
	@echo "Image tag will be: cwa:$(COMMIT_SHA)"

rebuild: build run

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

help:
	@echo "Available commands:"
	@echo "  make build         - Build the Docker image with current commit SHA"
	@echo "  make run          - Run the container"
	@echo "  make run-detached - Run the container in detached mode"
	@echo "  make stop         - Stop the container"
	@echo "  make clean        - Clean up Docker resources"
	@echo "  make version      - Show current version info"
	@echo "  make rebuild      - Rebuild and restart the container"
	@echo "  make logs         - Show container logs"
