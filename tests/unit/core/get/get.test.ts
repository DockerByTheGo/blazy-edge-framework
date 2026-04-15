import { describe, it, expect } from "vitest";
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
      .post({ path: "/resource", handeler: () => ({ body: { method: "post" } }) })
      .get({ path: "/resource", handler: () => ({ body: { method: "get" } }), args: undefined });

    const protocols = getProtocols(app.routes, "/resource");

    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeDefined();
    expect(protocols.POST).not.toBe(protocols.GET);
    expect(protocols.POST.metadata.subRoute).toBe("/resource");
    expect(protocols.GET.metadata.subRoute).toBe("/resource");
  });
});
