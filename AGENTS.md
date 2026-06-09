# Repository Guidelines

## Project Structure & Module Organization

This repository contains two applications:

- `frontend/`: React 19 and Vite UI. Put routed views in `src/pages/`, reusable UI in `src/components/`, API clients in `src/services/`, shared hooks in `src/hooks/`, utilities in `src/utils/`, and static images in `src/assets/`.
- `backend/`: Go API built with Gin, GORM, PostgreSQL, and WebSockets. Keep request logic in `controllers/` and `handlers/`, schemas in `models/`, middleware in `middleware/`, route registration in `routes/`, database setup in `config/`, and Telegram automation in `openclaw/`.

User-generated files belong in `backend/uploads/` and must not be committed.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

- `npm install`: install pinned dependencies.
- `npm run dev`: start Vite on the local network.
- `npm run lint`: run ESLint across JavaScript and JSX.
- `npm run build`: create the production bundle in `dist/`.
- `npm run preview`: serve the production bundle locally.

Run backend commands from `backend/`:

- `go mod tidy`: synchronize Go dependencies.
- `go run main.go`: start the API and embedded OpenClaw service on port `8080`.
- `go build -o server main.go`: build the production executable.
- `go test ./controllers ./handlers ./routes`: run package-targeted Go tests.

## Coding Style & Naming Conventions

Use `gofmt` for Go files. Keep Go package names lowercase, exported identifiers in `PascalCase`, and local identifiers in `camelCase`. For React, follow the existing two-space indentation and extensionless ES module imports. Name components and page files in `PascalCase.jsx`; use `camelCase` for hooks, utilities, and service methods. Run `npm run lint` before submitting frontend changes.

## Testing Guidelines

Use Go's standard `testing` package and name files `*_test.go`. Prefer focused package tests because utility files in the backend root can interfere with repository-wide test builds. The frontend currently has no automated test runner; validate UI changes with `npm run lint`, `npm run build`, and manual browser checks. Include screenshots for visible changes.

## Commit & Pull Request Guidelines

Follow Conventional Commits, for example `feat: add attendance export` or `fix: persist deleted chat messages`. Use focused branches such as `feature/attendance-export`. Pull requests should explain the behavior change, list validation commands, link relevant issues, and include screenshots for UI work.

## Security & Configuration

Keep credentials in `backend/.env`; never commit `.env`, database dumps, tokens, keys, or uploaded media. Preserve RBAC checks and validate authorization server-side when adding routes.
