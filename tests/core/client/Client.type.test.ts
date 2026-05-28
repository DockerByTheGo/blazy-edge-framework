import type { IMapable } from "@blazyts/better-standard-library";

import { describe, expectTypeOf, it } from "vitest";
import z from "zod/v4";

import { BlazyConstructor } from "src/app/constructors";
import { Client } from "src/client/Client";
import { TypedRecord } from "src/route/handlers";

import { makeMockHandler, makeNonFunctionRepresentationHandler, protocolLeaf } from "./clientTestHelpers";

describe("client types", () => {
  it("POST route is typed as a callable fn with the correct arg and return", () => {
    const handler = makeMockHandler<{ name: string }, { id: number }>("/users", { id: 1 });
    const tree = { users: protocolLeaf("POST", handler) };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.users["/"].POST).parameters.toEqualTypeOf<[{ name: string }]>();
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

  it("client.invoke itself is not any", () => {
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

  it("HTTP verb clients expose only the request body as their argument", () => {
    const app = BlazyConstructor
      .createEmpty()
      .post({
        path: "/products",
        handler: ctx => ({ body: { created: ctx.request.body.get("name") } }),
        args: z.object({ name: z.string() }),
      });
    const client = app.createClient().createClient()("http://localhost:3000");

    expectTypeOf(client.invoke.products["/"].POST).parameters.toEqualTypeOf<[{ name: string }]>();
    expectTypeOf(client.invoke.products["/"].POST).returns.toEqualTypeOf<Promise<IMapable<{
      body: TypedRecord<{ created: string }>;
    }>>>();
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
