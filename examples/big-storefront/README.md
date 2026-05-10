# Big Storefront Example

This example is a broad usage sketch for Blazy Edge. It is intentionally bigger than the tiny cart sample so the public framework surface is visible in one place.

It shows:

- `BlazyConstructor.createProd()`
- service registration with `addService`
- service method instrumentation with `servicify(...).methods.<method>.onCalled`
- request hooks with `beforeRequestHandler`
- hook helpers with `tap`
- lifecycle hooks with `afterHandler`, `onError`, `onStartup`, and `onShutdown`
- `block(...)` for side-effect hook registration without breaking the Blazy method chain
- route methods: `get`, `post`, `http`, `html`, `rpc`, `rpcFromFunction`, and `ws`
- response helpers: `JsonResponse`, `HtmlResponse` through `html`, and `TextResponse`
- typed client creation with `createClient().createClient()(baseUrl)`
- optional `listen(...)` when the file is run directly

Run it from the framework package:

```sh
bun examples/big-storefront/main.ts
```

Useful demo paths:

- `GET /health`
- `GET /inventory`
- `GET /users/:userId/orders`
- `POST /stores/:storeId/carts/:cartId/items`
- `POST /stores/:storeId/carts/:cartId/checkout`
- `POST /rpc/reserveInventory`
- `POST /rpc/quoteCart`
- `GET /admin/audit/recent`
- `GET /demo`
- `GET /robots.txt`
- `WS /stores/:storeId/live-cart`
