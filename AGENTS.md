## Techstack

- language: typescript
- runtime: nodejs 24
- testing: vitest

## Validation

**Run !`task world` to verify your changes.**

## CI

- GitHub Actions
- Ensure all actions are the latest major version

## Release

- DockerHub (credentials present at GitHub Secrets as DOCKER_USERNAME and DOCKER_PASSWORD)
- `latest` is auto-released from `main` when all tests pass

## Scripting

- Use go-task (Taskfile.yml) instead of npm scripts for all automation tasks.
- Run tasks with `task <name>` (e.g. `task test`, `task build`, `task check-local`).
- Prefer inline tasks for single commands, i.e. `test: npx run vitest` instead of `test:\ndesc: Run all tests\ncmds:\n- npx vitest run`.
- Have a `world` task that performs all verifications, builds and formatting / linting.
- Keep Docker image builds in `world`, and keep the Dockerfile aligned with the project build command so verification catches drift early.

## Shell Scripts

- Always use `#!/usr/bin/env bash` instead of `#!/bin/sh`.

## Code Style

- Favor classes over standalone functions; encapsulate related state and behavior in a class.
- Prefer abstractions: define interfaces for external dependencies (git, HTTP clients, etc.) so they can be swapped in tests.

## Testing

- Do not mock what you don't own. 
- Use HTTP interceptors (nock) for third-party HTTP clients instead of mocking the library itself.
- Inject fakes (plain classes implementing an interface) rather than mocking functions or modules with vi.mock. 
- Define an interface for the dependency and implement a fake in the test file.
