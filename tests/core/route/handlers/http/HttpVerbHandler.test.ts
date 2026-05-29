import { describe, expect, expectTypeOf, it } from "vitest";

import { HttpVerbHandler } from "src/route/handlers";
import type { HttpVerbHandlerCtx, NarrowTypedRecord } from "src/route/handlers";

describe("HttpVerbHandler", () => {
  it("handleRequest delegates to the handler function", () => {
    const handler = new HttpVerbHandler(
      (ctx: any) => ({ body: { path: ctx.request.path } }),
      { subRoute: "/health", method: "POST" },
    );

    expect(handler.handleRequest({
      request: { path: "/health" },
    } as any)).toEqual({ body: { path: "/health" } });
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
    expectTypeOf(handler.handleRequest).returns.toEqualTypeOf<{
      body: { created: string; productId: string };
    }>();
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
      body: NarrowTypedRecord<{ created: string }>;
    }>>();

  });
});
