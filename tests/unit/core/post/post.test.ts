import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

import { getProtocols } from "../utils/routeTree";

describe("post()", () => {
  it("registers the route directly in the router tree under POST", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users",
      handeler: () => ({ body: { ok: true } }),
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
      handeler: () => ({ body: { ok: true } }),
    });

    const protocols = getProtocols(app.routes, "/api/users");

    expect(app.routes.api.users).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata.subRoute).toBe("/api/users");
  });

  it("registers dynamic path segments in the router tree", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users/:userId/posts",
      handeler: () => ({ body: { ok: true } }),
    });

    const protocols = getProtocols(app.routes, "/users/:userId/posts");

    expect(app.routes.users[":userId"].posts).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata.subRoute).toBe("/users/:userId/posts");
  });

  it("does not register under GET", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/only-post",
      handeler: () => ({ body: {} }),
    });

    const protocols = getProtocols(app.routes, "/only-post");

    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeUndefined();
  });

  it("multiple post routes coexist as separate router branches", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/a", handeler: () => ({ body: { from: "a" } }) })
      .post({ path: "/b", handeler: () => ({ body: { from: "b" } }) });

    const aProtocols = getProtocols(app.routes, "/a");
    const bProtocols = getProtocols(app.routes, "/b");

    expect(aProtocols.POST).toBeDefined();
    expect(bProtocols.POST).toBeDefined();
    expect(aProtocols.POST).not.toBe(bProtocols.POST);
    expect(aProtocols.POST.metadata.subRoute).toBe("/a");
    expect(bProtocols.POST.metadata.subRoute).toBe("/b");
  });
});
