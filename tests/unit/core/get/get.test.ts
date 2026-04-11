import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";

describe("get()", () => {
  it("registers a handler at the given path under GET protocol", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/users",
      handler: () => ({ body: { list: [] } }),
      args: undefined,
    });

    const protocols = treeRouteFinder(app.routes, new Path("/users")).unpack() as any;
    expect(protocols.GET).toBeDefined();
  });

  it("does not register under POST", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/only-get",
      handler: () => ({ body: {} }),
      args: undefined,
    });

    const protocols = treeRouteFinder(app.routes, new Path("/only-get")).unpack() as any;
    expect(protocols.POST).toBeUndefined();
  });

  it("post and get on the same path coexist", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/resource", handeler: () => ({ body: { method: "post" } }) })
      .get({ path: "/resource", handler: () => ({ body: { method: "get" } }), args: undefined });

    const protocols = treeRouteFinder(app.routes, new Path("/resource")).unpack() as any;
    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeDefined();
  });
});
