import type { IRouteHandler, IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import type { IMapable } from "@blazyts/better-standard-library";

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { Client } from "src/client/Client";

// Client spreads extra fields (path, verb, …) on top of IRouteHandlerMetadata at runtime
type RuntimeMeta = IRouteHandlerMetadata & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Mock handler factory
//
// Returns a fully-typed IRouteHandler whose getClientRepresentation produces
// a concrete function type – this is what drives ClientObject<T> intellisense.
// ---------------------------------------------------------------------------
function makeMockHandler<TArg, TReturn>(
  subRoute: string,
  response: TReturn,
) {
  type ClientFn = (arg: TArg) => Promise<TReturn>;

  const clientFn = vi.fn(async (_arg: TArg): Promise<TReturn> => response);

  const handler = {
    metadata: { subRoute, verb: "POST" as const },
    handleRequest: (_arg: TArg): TReturn => response,
    getClientRepresentation: (_meta: RuntimeMeta): ClientFn => {
      Object.assign(clientFn, {
        method: "post",
        path: _meta.path ?? subRoute,
        metadata: _meta,
      });
      return clientFn;
    },
  } satisfies IRouteHandler<any, any>;

  return handler;
}

function makeNonFunctionRepresentationHandler<TRepresentation>(
  subRoute: string,
  representation: TRepresentation,
) {
  return {
    metadata: { subRoute, verb: "GET" as const },
    handleRequest: () => representation,
    getClientRepresentation: (_meta: RuntimeMeta): TRepresentation => representation,
  } satisfies IRouteHandler<any, any>;
}

// ---------------------------------------------------------------------------
// Typed route tree helpers
//
// Building the tree with explicit types lets TypeScript resolve ClientObject<T>
// all the way down, giving full intellisense on client.routes.
// ---------------------------------------------------------------------------
function protocolLeaf<
  TProtocol extends string,
  THandler extends IRouteHandler<any, any>,
>(protocol: TProtocol, handler: THandler) {
  return { "/": { [protocol]: handler } } as {
    "/": { [K in TProtocol]: THandler };
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("client", () => {
  it("exposes a route at the correct nested path", () => {
    const handler = makeMockHandler<{ name: string }, { id: number }>("/api/users", { id: 1 });
    const tree = { api: { users: protocolLeaf("POST", handler) } };

    const client = new Client(tree, "http://localhost:3000");

    // Full intellisense: client.routes.api.users["/"].POST is typed as
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

  it("passes path built from tree traversal to getClientRepresentation", () => {
    const receivedMeta: RuntimeMeta[] = [];

    const handler: IRouteHandler<any, any> = {
      metadata: { subRoute: "/deep/route", verb: "POST" },
      handleRequest: () => ({}),
      getClientRepresentation: (meta) => {
        receivedMeta.push(meta as RuntimeMeta);
        return vi.fn(async () => ({}));
      },
    };

    const tree = { deep: { route: protocolLeaf("POST", handler) } };
    new Client(tree, "http://localhost:3000");

    expect(receivedMeta[0]!.path).toBe("/deep/route");
  });
});

// ---------------------------------------------------------------------------
// Type-level tests – these are compile-time only, no runtime assertions needed
// ---------------------------------------------------------------------------
describe("client types", () => {
  it("pOST route is typed as a callable fn with the correct arg and return", () => {
    const handler = makeMockHandler<{ name: string }, { id: number }>("/users", { id: 1 });
    const tree = { users: protocolLeaf("POST", handler) };
    const client = new Client(tree, "http://localhost:3000");

    // arg type
    expectTypeOf(client.invoke.users["/"].POST).parameters.toEqualTypeOf<[{ name: string }]>();
    // return type
    expectTypeOf(client.invoke.users["/"].POST).returns.toEqualTypeOf<Promise<IMapable<{ id: number }>>>();
  });

  it("nested path resolves to the correct leaf type", () => {
    const handler = makeMockHandler<{ q: string }, { results: string[] }>("/api/search", { results: [] });
    const tree = { api: { search: protocolLeaf("POST", handler) } };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.api.search["/"].POST)
      .parameters
      .toEqualTypeOf<[{ q: string }]>();

    expectTypeOf(client.invoke.api.search["/"].POST)
      .returns
      .toEqualTypeOf<Promise<IMapable<{ results: string[] }>>>();
  });

  it("two protocols on the same path have independent types", () => {
    const postHandler = makeMockHandler<{ body: string }, { ok: boolean }>("/things", { ok: true });
    const getHandler = makeMockHandler<undefined, { items: number[] }>("/things", { items: [] });

    const tree = {
      things: {
        "/": { POST: postHandler, GET: getHandler },
      } as {
        "/": { POST: typeof postHandler; GET: typeof getHandler };
      },
    };

    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.things["/"].POST).parameters.toEqualTypeOf<[{ body: string }]>();
    expectTypeOf(client.invoke.things["/"].POST).returns.toEqualTypeOf<Promise<IMapable<{ ok: boolean }>>>();

    expectTypeOf(client.invoke.things["/"].GET).parameters.toEqualTypeOf<[undefined]>();
    expectTypeOf(client.invoke.things["/"].GET).returns.toEqualTypeOf<Promise<IMapable<{ items: number[] }>>>();
  });

  it("deeply nested route resolves all the way down", () => {
    const handler = makeMockHandler<{ x: number }, { y: number }>("/a/b/c", { y: 0 });
    const tree = { a: { b: { c: protocolLeaf("POST", handler) } } };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.a.b.c["/"].POST).parameters.toEqualTypeOf<[{ x: number }]>();
    expectTypeOf(client.invoke.a.b.c["/"].POST).returns.toEqualTypeOf<Promise<IMapable<{ y: number }>>>();
  });

  it("client.routes itself is not any", () => {
    const handler = makeMockHandler<{ v: boolean }, { v: boolean }>("/flag", { v: true });
    const tree = { flag: protocolLeaf("POST", handler) };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke).not.toBeAny();
  });

  it("infers arguments from the handler client representation", () => {
    const handler = makeMockHandler<
      { body: { title: string; tags: string[] }; query: { draft?: boolean } },
      { id: string }
    >("/articles", { id: "article-1" });
    const tree = { articles: protocolLeaf("POST", handler) };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.articles["/"].POST).parameters.toEqualTypeOf<[{
      body: { title: string; tags: string[] };
      query: { draft?: boolean };
    }]>();
  });

  it("wraps awaited handler return types in IMapable", () => {
    type HandlerReturn = Promise<{ ok: true; payload: { count: number } }>;

    const handler = makeMockHandler<{ cursor: string }, HandlerReturn>(
      "/reports",
      Promise.resolve({ ok: true, payload: { count: 1 } }),
    );
    const tree = { reports: protocolLeaf("POST", handler) };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.reports["/"].POST).returns.toEqualTypeOf<
      Promise<IMapable<{ ok: true; payload: { count: number } }>>
    >();
  });

  it("keeps non-function client representations typed as-is", () => {
    const representation = {
      open: (headers: { token: string }) => ({ connected: true as const, headers }),
      close: () => ({ closed: true as const }),
    };
    const handler = makeNonFunctionRepresentationHandler("/stream", representation);
    const tree = { stream: protocolLeaf("ws", handler) };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.stream["/"].ws).toEqualTypeOf<typeof representation>();
    expectTypeOf(client.invoke.stream["/"].ws.open).parameters.toEqualTypeOf<[{ token: string }]>();
    expectTypeOf(client.invoke.stream["/"].ws.close).returns.toEqualTypeOf<{ closed: true }>();
  });
});
