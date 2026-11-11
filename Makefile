SHELL := /bin/bash
.PHONY: help version install lint format check-changed build run publish stop clean

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

# Branch base for check-changed; override with `make check-changed BASE=origin/develop`
BASE ?= origin/main

# `git diff <merge-base>` covers commits on the branch plus staged and unstaged edits; ls-files adds
# new untracked files. Deleted files are left out (Biome fails on missing paths), unknown file types
# (md, yml) are skipped, and -z keeps paths with spaces intact.
check-changed:  ## Lint and format only the files changed on this branch (BASE=origin/main)
	@base=$$(git merge-base $(BASE) HEAD) || { echo "Cannot find merge base with $(BASE); run git fetch or set BASE=" >&2; exit 1; }; \
	{ git diff -z --name-only --diff-filter=d "$$base"; git ls-files -z --others --exclude-standard; } \
	  | sort -zu \
	  | xargs -0 -r ./node_modules/.bin/biome check --write --files-ignore-unknown=true --no-errors-on-unmatched

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
