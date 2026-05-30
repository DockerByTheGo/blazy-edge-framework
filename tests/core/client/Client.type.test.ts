import type { IMapable } from "@blazyts/better-standard-library";
import { describe, expectTypeOf, it } from "vitest";
import z from "zod/v4";
import { BlazyConstructor } from "src/app/constructors";
import { Client } from "src/client/Client";
import { TypedRecord } from "src/route/handlers";
import type { IResponseObject, IWHATWG, NarrowTypedRecord, TransformResponseUnionToObject } from "src/route/handlers/variations/http/types";
import { Message } from "src/route/handlers/variations/websocket/types";

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

  it("dynamic route segments are addressed by string values", () => {
    const handler = makeMockHandler<{ qty: number }, { id: string }>("/users/:id/orders", { id: "order-1" });
    const tree = { users: { ":id": { orders: protocolLeaf("POST", handler) } } };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.users).parameters.toEqualTypeOf<[param: string]>();
    expectTypeOf(client.invoke.users("u_123").orders["/"].POST).parameters.toEqualTypeOf<[{ qty: number }]>();
    expectTypeOf(client.invoke.users("u_123").orders["/"].POST).returns.toEqualTypeOf<Promise<IMapable<{ id: string }>>>();
  });

  it("preserves static route types beside dynamic route segments", () => {
    const dynamicHandler = makeMockHandler<{ qty: number }, { id: string }>("/users/:id/orders", { id: "order-1" });
    const staticHandler = makeMockHandler<undefined, { id: "me" }>("/users/me", { id: "me" });
    const tree = {
      users: {
        me: protocolLeaf("GET", staticHandler),
        ":id": { orders: protocolLeaf("POST", dynamicHandler) },
      },
    };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.users.me["/"].GET).parameters.toEqualTypeOf<[undefined]>();
    expectTypeOf(client.invoke.users.me["/"].GET).returns.toEqualTypeOf<Promise<IMapable<{ id: "me" }>>>();
    expectTypeOf(client.invoke.users("u_123").orders["/"].POST).parameters.toEqualTypeOf<[{ qty: number }]>();
    expectTypeOf(client.invoke.users("u_123").orders["/"].POST).returns.toEqualTypeOf<Promise<IMapable<{ id: string }>>>();
  });

  it("app clients use string values for dynamic route segments", () => {
    const app = BlazyConstructor
      .createEmpty()
      .get({
        path: "/users/:id",
        handler: ctx => ({ body: { id: ctx.request.params.get("id") } }),
      });
    const client = app.createClient().createClient()("http://localhost:3000");

    expectTypeOf(client.invoke.users("u_123")["/"].GET).parameters.toEqualTypeOf<[v?: {} | undefined]>();
    expectTypeOf(client.invoke.users("u_123")["/"].GET).returns.toEqualTypeOf<Promise<IMapable<{
      response: {
        body: NarrowTypedRecord<{ id: string }>;
        status: number;
      };
    } & IWHATWG<Response> & IResponseObject<TransformResponseUnionToObject<{
      body: { id: string };
    }>>>>>();
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
      response: {
        body: NarrowTypedRecord<{ created: string }>;
        status: number;
      };
    } & IWHATWG<Response> & IResponseObject<TransformResponseUnionToObject<{
      body: { created: string };
    }>>>>>();
  });

  it("transforms response unions into status handler schemas", () => {
    type ResponseUnion =
      | { status: 200; body: { ok: true } }
      | { status: 404; body: { message: string } };

    expectTypeOf(null as unknown as TransformResponseUnionToObject<ResponseUnion>).toMatchTypeOf(null as unknown as {
      statuses: {
        200: {
          status: 200;
          body: NarrowTypedRecord<{ ok: true }>;
        };
        404: {
          status: 404;
          body: NarrowTypedRecord<{ message: string }>;
        };
      };
    });

    type ResponseClient = IResponseObject<TransformResponseUnionToObject<ResponseUnion>>;
    expectTypeOf<ResponseClient["handle"]>().parameters.toEqualTypeOf<[Partial<{
      200: (response: { status: 200; body: NarrowTypedRecord<{ ok: true }> }) => unknown;
      404: (response: { status: 404; body: NarrowTypedRecord<{ message: string }> }) => unknown;
    }>]>();
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

  it("maps nested client representation functions while preserving their args and returns", () => {
    const representation = {
      open: (headers: { token: string }) => ({ connected: true as const, headers }),
      close: () => ({ closed: true as const }),
    };
    const handler = makeNonFunctionRepresentationHandler("/stream", representation);
    const tree = { stream: protocolLeaf("ws", handler) };
    const client = new Client(tree, "http://localhost:3000");

    expectTypeOf(client.invoke.stream["/"].ws.open).parameters.toEqualTypeOf<[{ token: string }]>();
    expectTypeOf(client.invoke.stream["/"].ws.open).returns.toEqualTypeOf<Promise<IMapable<{
      connected: true;
      headers: { token: string };
    }>>>();
    expectTypeOf(client.invoke.stream["/"].ws.close).returns.toEqualTypeOf<Promise<IMapable<{ closed: true }>>>();
  });

  it("preserves websocket message schema types through the app client", () => {
    const app = BlazyConstructor.createEmpty().ws({
      path: "/rooms",
      messages: {
        messagesItCanRecieve: {
          join: new Message(z.object({ roomId: z.string(), members: z.number() }), () => {}),
        },
        messagesItCanSend: {
          joined: new Message(z.object({ roomId: z.string() }), () => {}),
        },
      },
    });

    const client = app.createClient().createClient()("http://localhost:3000");

    expectTypeOf(client.invoke.rooms["/"].ws.send.join).parameters.toEqualTypeOf<[{
      roomId: string;
      members: number;
    }]>();
    expectTypeOf(client.invoke.rooms["/"].ws.send.join).returns.toEqualTypeOf<Promise<IMapable<void>>>();

    expectTypeOf(client.invoke.rooms["/"].ws.handle.joined).parameters.toMatchTypeOf<[
      (ctx: {
        message: {
          body: TypedRecord<{ roomId: string }>;
        };
      }) => void,
    ]>();
  });

  it("preserves websocket message schema types through dynamic route params", () => {
    const app = BlazyConstructor.createEmpty().ws({
      path: "/rooms/:roomId",
      messages: {
        messagesItCanRecieve: {
          join: new Message(z.object({ userId: z.string() }), () => {}),
        },
        messagesItCanSend: {
          joined: new Message(z.object({ userId: z.string() }), () => {}),
        },
      },
    });

    const client = app.createClient().createClient()("http://localhost:3000");

    expectTypeOf(client.invoke.rooms("room-1")["/"].ws.send.join).parameters.toEqualTypeOf<[{
      userId: string;
    }]>();
    expectTypeOf(client.invoke.rooms("room-1")["/"].ws.send.join).returns.toEqualTypeOf<Promise<IMapable<void>>>();

    expectTypeOf(client.invoke.rooms("room-1")["/"].ws.handle.joined).parameters.toMatchTypeOf<[
      (ctx: {
        message: {
          body: TypedRecord<{ userId: string }>;
        };
      }) => void,
    ]>();
  });
});
