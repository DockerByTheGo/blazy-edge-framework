# @blazyts/blazy-edge

Core Blazy Edge framework package.

It provides the `Blazy` app, route helpers, hooks, services, typed HTTP contexts, RPC routes, WebSocket routes, static file routes, response helpers, and a Bun `listen()` adapter.

## Basic App

```ts
import { BlazyConstructor } from "@blazyts/blazy-edge";

export const app = BlazyConstructor
  .createProd()
  .get({
    path: "/health",
    handler: () => ({ body: { ok: true } }),
  })
  .post({
    path: "/users",
    handler: ctx => {
      const name = ctx.request.body.get("name");
      return { body: { id: crypto.randomUUID(), name } };
    },
  });

app.listen(3000);
```

## Routes

Use `get()` and `post()` for HTTP routes. Dynamic path params are exposed through `ctx.request.params`.

```ts
const app = BlazyConstructor
  .createProd()
  .get({
    path: "/users/:userId",
    handler: ctx => ({
      body: {
        userId: ctx.request.params.get("userId"),
      },
    }),
  });
```

The request context includes:

- `ctx.request.url`, `path`, `method`, and `verb`
- `ctx.request.headers`
- `ctx.request.body`
- `ctx.request.params`
- `ctx.request.query`
- `ctx.response.json()`, `text()`, `html()`, and `standard()`

## Validation

POST routes can validate request bodies with Zod.

```ts
import z from "zod/v4";

const app = BlazyConstructor
  .createProd()
  .post({
    path: "/login",
    args: z.object({
      username: z.string(),
      password: z.string(),
    }),
    handler: ctx => ({
      body: {
        username: ctx.request.body.get("username"),
      },
    }),
  });
```

## Services

Services are added with `addService()` and are available as `ctx.services.<name>` when using `createProd()`.

```ts
const cartService = {
  config: {},
  getAll: () => ["cart-1", "cart-2"],
};

const app = BlazyConstructor
  .createProd()
  .addService("cart", cartService)
  .get({
    path: "/cart",
    handler: ctx => ({ body: ctx.services.cart.getAll() }),
  });
```

## Hooks

Use `beforeRequestHandler()` to enrich request context before the route handler runs.

```ts
const app = BlazyConstructor
  .createProd()
  .beforeRequestHandler("requestId", ctx => ({
    ...ctx,
    requestId: crypto.randomUUID(),
  }))
  .get({
    path: "/debug",
    handler: ctx => ({ body: { requestId: ctx.requestId } }),
  });
```

## RPC

`rpc()` exposes a function-style route under `/rpc/<name>`.

```ts
const app = BlazyConstructor
  .createProd()
  .rpc({
    name: "getCart",
    handler: () => ({ items: ["cart-1", "cart-2"] }),
  });
```

## WebSockets

Use `ws()` with message schemas to define request/response WebSocket behavior.

```ts
import { Message } from "@blazyts/blazy-edge";
import z from "zod/v4";

const app = BlazyConstructor
  .createProd()
  .ws({
    path: "/ws/:roomId",
    messages: {
      messagesItCanSend: {},
      messagesItCanRecieve: {
        ping: new Message(z.object({ value: z.string() }), async ctx => {
          await ctx.ws.message("pong", { value: ctx.message.body.get("value") });
        }),
      },
    },
  });
```

## Static Files And HTML

```ts
const app = BlazyConstructor
  .createProd()
  .file("./public/logo.png", "/logo.png")
  .html({
    path: "/",
    html: "<h1>Hello from Blazy</h1>",
  });
```

## Scripts

```bash
bun run build
bun run test
bun run lint
```
