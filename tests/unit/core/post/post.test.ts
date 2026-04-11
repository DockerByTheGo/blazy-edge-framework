import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";

describe("post()", () => {
  it("registers a handler at the given path under POST protocol", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users",
      handeler: () => ({ body: { ok: true } }),
    });

    const protocols = treeRouteFinder(app.routes, new Path("/users")).unpack() as any;
    expect(protocols.POST).toBeDefined();
  });

  it("calls the handler with the request body", () => {
    const received: unknown[] = [];

    const app = BlazyConstructor.createEmpty().post({
      path: "/submit",
      handeler: (arg: any) => { received.push(arg); return { body: {} }; },
    });

    const protocols = treeRouteFinder(app.routes, new Path("/submit")).unpack() as any;
    protocols.POST.handleRequest({ name: "alice" });

    expect(received).toEqual([{ name: "alice" }]);
  });

  it("returns the handler's return value", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/ping",
      handeler: () => ({ body: { pong: true } }),
    });

    const protocols = treeRouteFinder(app.routes, new Path("/ping")).unpack() as any;
    const result = protocols.POST.handleRequest({});

    expect(result).toEqual({ body: { pong: true } });
  });

  it("does not register under GET", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/only-post",
      handeler: () => ({ body: {} }),
    });

    const protocols = treeRouteFinder(app.routes, new Path("/only-post")).unpack() as any;
    expect(protocols.GET).toBeUndefined();
  });

  it("multiple post routes coexist independently", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/a", handeler: () => ({ body: { from: "a" } }) })
      .post({ path: "/b", handeler: () => ({ body: { from: "b" } }) });

    const a = (treeRouteFinder(app.routes, new Path("/a")).unpack() as any).POST.handleRequest({});
    const b = (treeRouteFinder(app.routes, new Path("/b")).unpack() as any).POST.handleRequest({});

    expect(a).toEqual({ body: { from: "a" } });
    expect(b).toEqual({ body: { from: "b" } });
  });
});
