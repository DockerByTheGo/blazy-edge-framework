import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";

describe("rpc()", () => {
  it("registers a POST handler at /rpc/{name}", () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "doThing",
      handler: () => ({ body: { done: true } }),
    });

    const result = treeRouteFinder(app.routes, new Path("/rpc/doThing"));
    expect(result.isSome()).toBe(true);
    expect((result.unpack() as any).POST).toBeDefined();
  });

  it("calls the handler and returns its value", () => {
    const received: unknown[] = [];

    const app = BlazyConstructor.createEmpty().rpc({
      name: "echo",
      handler: (arg: any) => { received.push(arg); return { body: arg }; },
    });

    const protocols = treeRouteFinder(app.routes, new Path("/rpc/echo")).unpack() as any;
    const result = protocols.POST.handleRequest({ msg: "hi" });

    expect(received).toEqual([{ msg: "hi" }]);
    expect(result).toEqual({ body: { msg: "hi" } });
  });

  it("two rpc routes do not collide", () => {
    const app = BlazyConstructor.createEmpty()
      .rpc({ name: "alpha", handler: () => ({ body: { r: "alpha" } }) })
      .rpc({ name: "beta",  handler: () => ({ body: { r: "beta" } }) });

    const alpha = (treeRouteFinder(app.routes, new Path("/rpc/alpha")).unpack() as any).POST.handleRequest({});
    const beta  = (treeRouteFinder(app.routes, new Path("/rpc/beta")).unpack() as any).POST.handleRequest({});

    expect(alpha).toEqual({ body: { r: "alpha" } });
    expect(beta).toEqual({ body: { r: "beta" } });
  });
});
