import { describe, expect, it } from "vitest";
import z from "zod/v4";

import { BlazyConstructor } from "src/app/constructors";

import { getProtocols } from "../utils/routeTree";

describe("post()", () => {
  it("registers the route directly in the router tree under POST", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users",
      handler: () => ({ body: { ok: true } }),
    });

    const protocols = getProtocols(app.routes, "/users");

    expect(app.routes).toHaveProperty("users");
    expect(app.routes.users).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata).toMatchObject({
      subRoute: "/users",
      verb: "POST",
      protocol: "POST",
    });
  });

  it("registers nested paths as nested router nodes", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/api/users",
      handler: () => ({ body: { ok: true } }),
    });

    const protocols = getProtocols(app.routes, "/api/users");

    expect(app.routes.api.users).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata.subRoute).toBe("/api/users");
  });

  it("registers dynamic path segments in the router tree", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users/:userId/posts",
      handler: () => ({ body: { ok: true } }),
    });

    const protocols = getProtocols(app.routes, "/users/:userId/posts");

    expect(app.routes.users[":userId"].posts).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata.subRoute).toBe("/users/:userId/posts");
  });

  it("does not register under GET", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/only-post",
      handler: () => ({ body: {} }),
    });

    const protocols = getProtocols(app.routes, "/only-post");

    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeUndefined();
  });

  it("multiple post routes coexist as separate router branches", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/a", handler: () => ({ body: { from: "a" } }) })
      .post({ path: "/b", handler: () => ({ body: { from: "b" } }) });

    const aProtocols = getProtocols(app.routes, "/a");
    const bProtocols = getProtocols(app.routes, "/b");

    expect(aProtocols.POST).toBeDefined();
    expect(bProtocols.POST).toBeDefined();
    expect(aProtocols.POST).not.toBe(bProtocols.POST);
    expect(aProtocols.POST.metadata.subRoute).toBe("/a");
    expect(bProtocols.POST.metadata.subRoute).toBe("/b");
  });

  it("returns a friendly failed validation response for invalid POST bodies", async () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users",
      args: z.object({ name: z.string() }),
      handler: (ctx: any) => ({ body: { created: ctx.request.body.get("name") } }),
    });

    const response = await app.route({
      reqData: {
        url: "/users",
        protocol: "POST",
        verb: "POST",
        body: { name: 123 },
        headers: {},
      },
    }) as Response;

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      type: "validation_failed",
      body: {
        fieldErrors: {
          name: expect.any(Array),
        },
      },
    });
  });

  it("wraps valid POST bodies with the typed record helper", async () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users",
      args: z.object({ name: z.string() }),
      handler: ctx => ({ body: { created: ctx.request.body.get("name") } }),
    });

    await expect(app.route({
      reqData: {
        url: "/users",
        protocol: "POST",
        verb: "POST",
        body: { name: "Ada" },
        headers: {},
      },
    })).resolves.toEqual({ body: { created: "Ada" } });
  });
});
