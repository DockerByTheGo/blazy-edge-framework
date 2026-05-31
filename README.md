# Blazy Edge Framework

Higher-level backend framework built on the minimal backend lib, with services, route builders, hooks, RPC/client helpers, and file/websocket handlers.

## Install

`bun add @blazyts/blazy-edge`

## Usage

```ts
import { BlazyConstructor } from '@blazyts/blazy-edge';
```

- Create an app with the framework constructors, register services and routes, then expose HTTP/file/websocket handlers.
- Use this package as the core integration point for batteries such as auth, cache, logger, file upload, and explorer UI.

## Public Surface

- Package name: `@blazyts/blazy-edge`
- Module kind: `module`
- Entry point: `index.ts`

Runtime dependencies: `@aws-sdk/client-s3`, `zod`.
Peer dependencies: `typescript`.

## Scripts

- `bun run build`: `bunx tsc -p tsconfig.json --noEmit`
- `bun run lint`: `bun --bun eslint src tests`
- `bun run node:test`: `bun x --bun vitest run --config vitest.config.ts`
- `bun run bun:test`: `bun test`
- `bun run coverage`: `bun test --coverage`

## Notes

- Batteries import internal service contracts from this package, so moving service types can cascade through many packages.
- Route DSL, normal routing, and custom matchers coexist; preserve public types while refactoring internals.
- Some README-level docs also exist one directory up in `core/blazy-edge/docs`.
