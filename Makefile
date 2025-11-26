.PHONY: build run stop clean

APP_VERSION := $(shell git describe --tags --always --dirty)


all: build

build:
	@echo "Building image version: $(APP_VERSION)"
	docker compose build


run:
	@echo "Starting container version: $(APP_VERSION)"
	docker compose up --watch

run-detached:
	@echo "Starting container in detached mode with version: $(APP_VERSION)"
	docker compose up -d

stop:
	docker compose down

clean:
	docker compose down --rmi local --volumes --remove-orphans

version:
	@echo "Current version: $(APP_VERSION)"
	@echo "Image tag will be: cwa:$(APP_VERSION)"

rebuild: build run

logs:
	docker compose logs -f

help:
	@echo "Available commands:"
	@echo "  make build        - Build the Docker image with current commit SHA"
	@echo "  make run          - Run the container"
	@echo "  make run-detached - Run the container in detached mode"
	@echo "  make stop         - Stop the container"
	@echo "  make clean        - Clean up Docker resources"
	@echo "  make version      - Show current version info"
	@echo "  make rebuild      - Rebuild and restart the container"
	@echo "  make logs         - Show container logs"
