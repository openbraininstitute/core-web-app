SHELL := /bin/bash
.PHONY: help version install lint format build run publish stop clean

export APP_NAME := core-web-app
export APP_VERSION := $(shell git describe --abbrev --dirty --always --tags)

export IMAGE_NAME ?= $(APP_NAME)
export IMAGE_TAG ?= $(APP_VERSION)

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-23s\033[0m %s\n", $$1, $$2}'

version:  ## Show current version
	@echo "$(APP_VERSION)"

install:  ## Install dependencies
	pnpm install

lint:  ## Run linter
	pnpm lint

format:  ## Apply formatter
	pnpm run format

build:  ## Build the Docker image
	@echo "Building image $(IMAGE_NAME):$(APP_VERSION)"
	docker compose build

run:  ## Run the Docker image
	@echo "Starting container $(IMAGE_NAME):$(APP_VERSION)"
	docker compose up --watch

publish: build  ## Publish the Docker image
	docker compose push app

stop:  ## Stop the container
	docker compose down

clean:  ## Clean up Docker resources
	docker compose down --rmi local --volumes --remove-orphans
