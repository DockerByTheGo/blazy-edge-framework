# Onboarding

## Purpose

This document exists for people who are new to the project, and for AI agents reading the codebase for the first time. If something is not obvious from a first pass through the files, document it here. The goal is to explain the code practices, standards, and project quirks so future contributors understand why the code is shaped the way it is.

## Code practices and standards

### Runtime and module style

This package is built around Bun as the runtime. The package uses ESM (`"type": "module"`) and TypeScript source files directly, so code should be written with modern module syntax and runtime-compatible APIs.

Prefer small focused modules, explicit exports, and clear public entry points. The framework code is intended to be consumed as a library, so changes should avoid hidden side effects and should keep the public API predictable.

### TypeScript

TypeScript is the main correctness layer. The project uses strict compiler settings, including:

- `strict`
- `noFallthroughCasesInSwitch`
- `noImplicitOverride`
- `noUncheckedIndexedAccess`
- `verbatimModuleSyntax`
- `moduleResolution: "bundler"`

These settings are used because this framework relies heavily on type inference, route types, handlers, hooks, and client/server contracts. Type regressions can be just as serious as runtime regressions, so prefer typed helpers and explicit boundaries over `any`.

`noUnusedLocals` and `noUnusedParameters` are currently disabled. That gives room for examples, test scaffolding, and framework APIs where names sometimes exist for readability or future extension. Do not treat that as permission to leave dead production code behind.

Run the type check with:

```sh
bun run build
```

### Linting

The package extends the repository-level ESLint configuration and disables `unicorn/filename-case` locally. That means normal lint expectations still apply, but file names are allowed to follow the existing framework naming style.

Run linting with:

```sh
bun run lint
```

### Code structure

The framework source lives under `src`. The root `index.ts` file only re-exports `src`, and `src/index.ts` defines the public framework surface by re-exporting the main modules:

- `app`
- `response`
- `route/handlers`
- `services`

Treat this export chain as intentional. Code should not become public just because it exists somewhere in `src`; it becomes public when it is exported through the relevant module barrel and, if needed, through `src/index.ts`.

Folders usually represent modules or submodules. For example:

- `src/app` contains the app core and constructors.
- `src/client` contains the client and client builder.
- `src/hooks` contains hook helpers such as `add`, `tap`, `guard`, and `replace`.
- `src/route` contains route finders, matchers, and handlers.
- `src/services` contains the service abstraction, manager, and built-in service contracts.
- `src/utils` contains shared utilities that are not part of a more specific domain.

Prefer adding new code inside the closest existing domain folder. If a feature belongs to route handling, keep it under `route/handlers`; if it belongs to service management, keep it under `services`; if it is only shared by one area, keep it local to that area instead of moving it into `utils`.

### File naming and module conventions

The project uses a mix of direct files and folder modules:

- `index.ts` is a barrel file. It should mostly re-export from sibling files or child modules.
- `main.ts` is commonly used when a folder module has one primary implementation and the folder's `index.ts` re-exports it.
- Named files such as `Client.ts`, `Service.ts`, `HooksCombiner.ts`, and `HttpVerbRouteHandler.ts` usually contain the main class, type, or implementation with the same name.
- `types/index.ts` is used for grouped type exports when a module has several related type files.

Keep barrel files boring. They should make imports nicer and define module boundaries; they should not contain meaningful runtime logic. If a barrel starts needing logic, move that logic into a named file or `main.ts` and export it from the barrel.

This pattern gives us predictable imports:

```ts
export * from "./main";
export * from "./types";
```

It also lets consumers import from a stable module path without knowing every internal filename. For example, callers should be able to import a route matcher variation from the variation module, while the implementation can still live in `main.ts` and related type files.

When adding a new module:

- Put implementation in a named file or `main.ts`.
- Add or update the nearest `index.ts` barrel.
- Re-export from parent barrels only when the parent module should expose it.
- Avoid exporting internal helpers from high-level barrels unless they are part of the intended API.

### Testing

Tests live under `framework/tests` and are grouped by behavior:

- `tests/unit` covers individual framework features and contracts.
- `tests/e2e` covers end-to-end flows through the server/client path.
- `tests/mocks` contains runtime and handler mocks used by the test harness.
- `tests/helpers` contains shared test helpers and fixtures.

When adding behavior, add tests near the behavior being changed. Prefer tests that describe the public contract instead of only checking implementation details.

### Why both Bun test and Vitest are used

The project intentionally keeps both test paths:

```sh
bun run node:test
bun run bun:test
```

`bun run node:test` runs Vitest through Bun:

```sh
bun x --bun vitest run --config vitest.config.ts
```

We use Vitest because it makes it easier to test the framework under different environments. This framework is Bun-first, and Bun is the intended way to use it, but Node support is still part of the compatibility promise. Vitest gives us a flexible runner for checking behavior outside the direct Bun test runner path.

Vitest also gives us a richer test harness:

- path aliases for `src`, `@test`, and internal workspace packages
- a setup file at `tests/setup/vitest.ts`
- custom matchers such as `toBeFunction`
- controlled mocks, including the local `bun` module mock
- familiar test filtering and reporting
- utilities for type testing

Bun has some type-testing support, but at the moment it is not enough for what this framework needs. Vitest's type-testing utilities are more complete and easier to use when checking the framework's TypeScript contracts.

`bun run bun:test` runs Bun's native test runner directly:

```sh
bun test
```

We keep it because Bun is the primary runtime target and we need to know how the framework behaves when executed by Bun itself. It is also the coverage path:

```sh
bun test --coverage
```

Coverage currently uses Bun because Vitest does not implement `node:inspector`, and the available fixes/workarounds are not reliable enough for this project.

In short:

- Use Vitest for multi-environment testing, Node compatibility checks, and type-testing utilities.
- Use Bun test for Bun-runtime confidence and coverage.
- A change is safest when it passes both.

## Quirks

### Difference between the route handler tests and the tests under core

The tests under core check whether high-level framework methods define routes correctly in the router tree. The route handler tests check the specific `RouteHandler` implementations themselves. In other words, one layer verifies that the framework wires routes correctly, and the other verifies that each handler behaves correctly once it is selected.
