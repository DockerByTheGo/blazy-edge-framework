import { describe, expect, expectTypeOf, it } from "vitest";

import { HttpVerbHandler } from "src/route/handlers";
import type { HttpVerbHandlerCtx, IWHATWG, NarrowTypedRecord } from "src/route/handlers/variations/http/types";

describe("HttpVerbHandler", () => {
  it("handleRequest returns 201 JSON for object handler returns", async () => {
    const handler = new HttpVerbHandler(
      (ctx: any) => ({ body: { path: ctx.request.path } }),
      { subRoute: "/health", method: "POST" },
    );

    const response = handler.handleRequest({
      request: { path: "/health" },
    } as any);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ body: { path: "/health" } });
  });

  it("handleRequest maps null, undefined, explicit statuses, and errors", async () => {
    const nullHandler = new HttpVerbHandler(() => null, { subRoute: "/empty", method: "POST" });
    const undefinedHandler = new HttpVerbHandler(() => undefined, { subRoute: "/missing", method: "POST" });
    const explicitHandler = new HttpVerbHandler(() => ({ status: 202, body: { queued: true } }), { subRoute: "/queued", method: "POST" });
    const errorHandler = new HttpVerbHandler(() => {
      throw new Error("boom");
    }, { subRoute: "/errored", method: "POST" });

    expect(nullHandler.handleRequest({} as any).status).toBe(204);

    const notFound = undefinedHandler.handleRequest({} as any);
    expect(notFound.status).toBe(404);
    await expect(notFound.json()).resolves.toBeNull();

    const explicit = explicitHandler.handleRequest({} as any);
    expect(explicit.status).toBe(202);
    await expect(explicit.json()).resolves.toEqual({ queued: true });

    const errored = errorHandler.handleRequest({} as any);
    expect(errored.status).toBe(500);
    await expect(errored.json()).resolves.toEqual({ message: "boom" });
  });

  it("handleRequest awaits async handlers before creating the response", async () => {
    const handler = new HttpVerbHandler(
      async () => new Response(JSON.stringify({ ok: true }), { status: 202 }),
      { subRoute: "/async", method: "POST" },
    );

    const response = await handler.handleRequest({} as any);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("handleRequest narrows request body, params, and response data types", () => {
    type Ctx = HttpVerbHandlerCtx<
      { auth: { userId: string } },
      { name: string },
      { productId: string }
    >;

    const handler = new HttpVerbHandler<Ctx, { body: { created: string; productId: string } }>(
      (ctx) => {
        expectTypeOf(ctx.auth.userId).toEqualTypeOf<string>();
        expectTypeOf(ctx.request.body).toEqualTypeOf<NarrowTypedRecord<{ name: string }>>();
        expectTypeOf(ctx.request.body.get("name")).toEqualTypeOf<string>();
        expectTypeOf(ctx.request.params).toEqualTypeOf<NarrowTypedRecord<{ productId: string }>>();
        expectTypeOf(ctx.request.params.get("productId")).toEqualTypeOf<string>();
        expectTypeOf(ctx.request).toMatchTypeOf<IWHATWG<Request>>();
        expectTypeOf(ctx.request.whatwg()).toEqualTypeOf<Request>();

        return {
          body: {
            created: ctx.request.body.get("name"),
            productId: ctx.request.params.get("productId"),
          },
        };
      },
      { subRoute: "/products/:productId", method: "POST" },
    );

    expectTypeOf(handler.handleRequest).parameters.toEqualTypeOf<[Ctx]>();
    expectTypeOf(handler.handleRequest).returns.toEqualTypeOf<Response>();
  });

  it("getClientRepresentation returns a callable client with route metadata", () => {
    const handler = new HttpVerbHandler(
      (ctx: any) => ({ body: { path: ctx.request.path } }),
      { subRoute: "/health", method: "POST" },
    );

    const client = handler.getClientRepresentation({
      serverUrl: "http://localhost:3000/health",
      subRoute: "/health",
      path: "/health",
      verb: "GET",
      protocol: "GET",
    } as any);

    expect(client).toBeFunction();
    expect(client.path).toBe("/health");
    expect(client.metadata).toMatchObject({
      serverUrl: "http://localhost:3000/health",
      subRoute: "/health",
      verb: "GET",
      protocol: "GET",
    });
  });

  it("getClientRepresentation narrows request and response payload types", () => {
    type Ctx = HttpVerbHandlerCtx<{}, { name: string }, { productId: string }>;
    const handler = new HttpVerbHandler<Ctx, { body: { created: string } }>(
      () => ({ body: { created: "Ada" } }),
      { subRoute: "/products/:productId", method: "POST" },
    );

    const client = handler.getClientRepresentation({
      serverUrl: "http://localhost:3000/products/1",
      subRoute: "/products/:productId",
    });
    expectTypeOf(client).parameters.toEqualTypeOf<[{ name: string }]>();
    expectTypeOf(null as unknown as ReturnType<typeof client>).toMatchTypeOf<Promise<{
      response: {
        body: NarrowTypedRecord<{ created: string }>;
        status: number;
      };
    } & IWHATWG<Response>>>();

  });
});
