# Blazy Edge Framework Onboarding

This file is for contributors changing `@blazyts/blazy-edge`. The README is for library consumers; keep implementation notes and project conventions here.

## Project Structure

- `src/app` contains app construction and core app behavior.
- `src/route` contains route handlers, finders, and matcher variations.
- `src/services` contains service result helpers and built-in service contracts.
- `tests/core` mirrors the framework areas by behavior.

## Local Workflow

1. Install workspace dependencies from `project` with `bun install` unless this module has its own lockfile and you intentionally need isolated installs.
2. Make focused changes inside this module and its direct shared dependencies.
3. Run the narrowest relevant script before broad workspace checks.

## Scripts

- `bun run build`: `bunx tsc -p tsconfig.json --noEmit`
- `bun run lint`: `bun --bun eslint src tests`
- `bun run node:test`: `bun x --bun vitest run --config vitest.config.ts`
- `bun run bun:test`: `bun test`
- `bun run coverage`: `bun test --coverage`

## Design Choices

- Create an app with the framework constructors, register services and routes, then expose HTTP/file/websocket handlers.
- Use this package as the core integration point for batteries such as auth, cache, logger, file upload, and explorer UI.

## Things To Know

- Batteries import internal service contracts from this package, so moving service types can cascade through many packages.
- Route DSL, normal routing, and custom matchers coexist; preserve public types while refactoring internals.
- Some README-level docs also exist one directory up in `core/blazy-edge/docs`.

## Contribution Rules

- Keep public exports routed through the package entry point.
- Prefer existing Result/Option/service contracts from workspace packages over introducing parallel abstractions.
- Add tests beside the behavior you change when the module already has a `tests` directory.
- Do not commit secrets, generated coverage, or live-service credentials.
