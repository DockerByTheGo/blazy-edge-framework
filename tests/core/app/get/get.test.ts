import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

import { getProtocols } from "../utils/routeTree";

describe("get()", () => {
  it("registers the route directly in the router tree under GET", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/users",
      handler: () => ({ body: { list: [] } }),
      args: undefined,
    });

    const protocols = getProtocols(app.routes, "/users");

    expect(app.routes).toHaveProperty("users");
    expect(app.routes.users).toHaveProperty("/");
    expect(protocols.GET).toBeDefined();
    expect(protocols.GET.metadata).toMatchObject({
      subRoute: "/users",
      verb: "GET",
      protocol: "GET",
    });
  });

  it("registers nested paths as nested router nodes", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/api/users",
      handler: () => ({ body: { list: [] } }),
      args: undefined,
    });

    const protocols = getProtocols(app.routes, "/api/users");

    expect(app.routes.api.users).toHaveProperty("/");
    expect(protocols.GET).toBeDefined();
    expect(protocols.GET.metadata.subRoute).toBe("/api/users");
  });

  it("registers dynamic path segments in the router tree", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/users/:userId/posts",
      handler: () => ({ body: { list: [] } }),
      args: undefined,
    });

    const protocols = getProtocols(app.routes, "/users/:userId/posts");

    expect(app.routes.users[":userId"].posts).toHaveProperty("/");
    expect(protocols.GET).toBeDefined();
    expect(protocols.GET.metadata.subRoute).toBe("/users/:userId/posts");
  });

  it("does not register under POST", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/only-get",
      handler: () => ({ body: {} }),
      args: undefined,
    });

    const protocols = getProtocols(app.routes, "/only-get");

    expect(protocols.GET).toBeDefined();
    expect(protocols.POST).toBeUndefined();
  });

  it("post and get on the same path coexist in the router tree", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/resource", handler: () => ({ body: { method: "post" } }) })
      .get({ path: "/resource", handler: () => ({ body: { method: "get" } }), args: undefined });

    const protocols = getProtocols(app.routes, "/resource");

    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeDefined();
    expect(protocols.POST).not.toBe(protocols.GET);
    expect(protocols.POST.metadata.subRoute).toBe("/resource");
    expect(protocols.GET.metadata.subRoute).toBe("/resource");
  });

  it("does not expose internal request fields on the route handler context", async () => {
    const app = BlazyConstructor.createProd()
      .beforeRequestHandler("addMeta", ctx => ({ ...ctx, meta: { internal: true } }))
      .get({
        path: "/public-context",
        handler: ctx => ({
          body: {
            hasReqData: "reqData" in ctx,
            hasMeta: "meta" in ctx,
          },
        }),
      });

    const response = await app.route({
      reqData: {
        body: {},
        headers: {},
        protocol: "GET",
        url: "http://localhost/public-context",
      },
    });

    expect(response).toBeInstanceOf(Response);
    await expect((response as Response).json()).resolves.toMatchObject({
      body: {
        hasReqData: false,
        hasMeta: false,
      },
    });
  });

  it("awaits async before handlers before invoking the route handler", async () => {
    const app = BlazyConstructor.createProd()
      .beforeRequestHandler("attachUser", async ctx => ({
        ...ctx,
        user: { id: "ada" },
      }))
      .get({
        path: "/me",
        handler: ctx => {
          if (!ctx.user) {
            return ctx.createResponse.json({ error: "unauthorized" }, { status: 401 });
          }

          return ctx.createResponse.json({ user: ctx.user }, { status: 200 });
        },
      });

    const response = await app.route({
      reqData: {
        body: {},
        headers: {},
        protocol: "GET",
        url: "http://localhost/me",
      },
    }) as Response;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: { id: "ada" } });
  });
});
