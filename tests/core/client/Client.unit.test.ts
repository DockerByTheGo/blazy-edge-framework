import { describe, expect, it } from "vitest";

import { Client } from "src/client/Client";

import { makeMockHandler, protocolLeaf } from "./clientTestHelpers";
import { BlazyConstructor } from "src";
import { listenWithPortFallback } from "../../helpers/ports";
import z from "zod/v4";

describe("client", () => {
  it("exposes a route at the correct nested path", () => {
    const handler = makeMockHandler<{ name: string }, { id: number }>("/api/users", { id: 1 });
    const tree = { api: { users: protocolLeaf("POST", handler) } };

    const client = new Client(tree, "http://localhost:3000");

    // Full intellisense: client.invoke.api.users["/"].POST is typed as
    // (arg: { name: string }) => Promise<{ id: number }>
    expect(client.invoke.api.users["/"]).toBeDefined();
    expect(client.invoke.api.users["/"].POST).toBeDefined();
  });

  it("the client fn is callable and returns the mocked response", async () => {
    const handler = makeMockHandler<{ qty: number }, { created: boolean }>("/orders", { created: true });
    const tree = { orders: protocolLeaf("POST", handler) };

    const client = new Client(tree, "http://localhost:3000");

    // intellisense knows this is (arg: { qty: number }) => Promise<IMapable<{ created: boolean }>>
    const result = await client.invoke.orders["/"].POST({ qty: 3 });

    expect(result.raw).toEqual({ created: true });
  });

  it("multiple protocols on the same path are both built", () => {
    const postHandler = makeMockHandler<{ body: string }, { ok: boolean }>("/things", { ok: true });
    const getHandler = makeMockHandler<void, { items: string[] }>("/things", { items: [] });

    const tree = {
      things: {
        "/": { POST: postHandler, GET: getHandler },
      } as {
        "/": { POST: typeof postHandler; GET: typeof getHandler };
      },
    };

    const client = new Client(tree, "http://localhost:3000");

    // intellisense: POST and GET are distinct typed fns
    expect(client.invoke.things["/"].POST).toBeDefined();
    expect(client.invoke.things["/"].GET).toBeDefined();
  });

  it("deeply nested routes are reachable", () => {
    const handler = makeMockHandler<{ x: number }, { y: number }>("/a/b/c", { y: 42 });
    const tree = { a: { b: { c: protocolLeaf("POST", handler) } } };

    const client = new Client(tree, "http://localhost:3000");

    // intellisense resolves all three levels
    expect(client.invoke.a.b.c["/"].POST).toBeDefined();
  });

  it("uses string values for dynamic route segments", async () => {
    const handler = makeMockHandler<{ qty: number }, { id: string }>("/users/:id/orders", { id: "order-1" });
    const tree = { users: { ":id": { orders: protocolLeaf("POST", handler) } } };

    const client = new Client(tree, "http://localhost:3000");
    const result = await client.invoke.users("u_123").orders["/"].POST({ qty: 2 });

    expect(client.invoke.users("u_123").orders["/"].POST.metadata.serverUrl).toBe("http://localhost:3000/users/u_123/orders");
    expect(result.raw).toEqual({ id: "order-1" });
  });

  it("keeps static routes beside dynamic route segments", async () => {
    const dynamicHandler = makeMockHandler<{ qty: number }, { id: string }>("/users/:id/orders", { id: "order-1" });
    const staticHandler = makeMockHandler<void, { id: "me" }>("/users/me", { id: "me" });
    const tree = {
      users: {
        me: protocolLeaf("GET", staticHandler),
        ":id": { orders: protocolLeaf("POST", dynamicHandler) },
      },
    };

    const client = new Client(tree, "http://localhost:3000");

    await client.invoke.users("u_123").orders["/"].POST({ qty: 2 });
    await client.invoke.users.me["/"].GET(undefined);

    expect(client.invoke.users("u_123").orders["/"].POST.metadata.serverUrl).toBe("http://localhost:3000/users/u_123/orders");
    expect(client.invoke.users.me["/"].GET.metadata.serverUrl).toBe("http://localhost:3000/users/me");
  });

  it("correctly sends a request", async () => {
    const app = BlazyConstructor
      .createProd()
      .get({
        path: "/test",
        handler: () => ({ success: true }),
        args: z.object({}),
      });

    const server = app.listen(0);
    const client = app.createClient().createClient()(`http://localhost:${server.port}`);

    try {
      const g = await client.invoke.test["/"].GET();
      expect(g.raw).toEqual({ success: true });
    }
    finally {
      server.stop?.();
    }
  });

  it("sends only the provided body for HTTP verb clients", async () => {
    const app = BlazyConstructor
      .createProd()
      .post({
        path: "/products",
        handler: ctx => ({ body: { created: ctx.request.body.get("name") } }),
        args: z.object({ name: z.string() }),
      });

    const server = listenWithPortFallback(port => app.listen(port), [3015, 3016, 3017]);
    const client = app.createClient().createClient()(`http://localhost:${server.port}`);

    try {
      const result = await client.invoke.products["/"].POST({ name: "Ada" });
      expect(result.raw.body.get("created")).toBe("Ada");
      expect(result.raw.body.raw()).toEqual({ created: "Ada" });
      expect(result.raw.whatwg()).toBeInstanceOf(Response);
      expect(result.raw.whatwg().status).toBe(201);
      expect(result.raw.handle({
        201: response => (response as { body: { created: string } }).body.created,
      })).toBe("Ada");
    }
    finally {
      server.stop?.();
    }
  });

  it("keeps HTTP response helpers when the response body is null", async () => {
    const app = BlazyConstructor
      .createProd()
      .get({
        path: "/empty",
        handler: () => null,
      })
      .get({
        path: "/missing",
        handler: () => undefined,
      });

    const server = app.listen(0);
    const client = app.createClient().createClient()(`http://localhost:${server.port}`);

    try {
      const empty = await client.invoke.empty["/"].GET();
      expect(empty.raw.whatwg().status).toBe(204);
      expect(empty.raw.handle({
        204: response => response,
      })).toBeNull();

      const missing = await client.invoke.missing["/"].GET();
      expect(missing.raw.whatwg().status).toBe(404);
      expect(missing.raw.handle({
        404: response => response,
      })).toBeNull();
    }
    finally {
      server.stop?.();
    }
  });

  it("sends concrete values for multiple dynamic HTTP route segments", async () => {
    const app = BlazyConstructor
      .createProd()
      .get({
        path: "/:hi/:koko",
        handler: ctx => ({
          hi: ctx.request.params.get("hi"),
          ko: ctx.request.params.get("koko"),
        }),
      });

    const server = app.listen(0);
    const client = app.createClient().createClient()(`http://localhost:${server.port}`);

    try {
      const result = await client.invoke("hello")("d")["/"].GET();
      expect(result.raw).toEqual({
        hi: "hello",
        ko: "d",
      });
    }
    finally {
      server.stop?.();
    }
  });
});
