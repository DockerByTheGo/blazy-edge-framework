import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import type { IRouteHandler, IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import { NormalRouting } from "src/route/matchers/normal";

function stubHandler(subRoute: string): IRouteHandler<any, any> {
  return {
    metadata: { subRoute },
    handleRequest: (arg: any) => arg,
    getClientRepresentation: (_meta: IRouteHandlerMetadata) => () => {},
  };
}

describe("addRoute", () => {
  it("registers a handler reachable via treeRouteFinder", () => {
    const handler = stubHandler("/items");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/items"),
      handler,
      protocol: "POST",
    });

    const result = treeRouteFinder(app.routes, new Path("/items"));
    expect(result.isSome()).toBe(true);
    expect((result.unpack() as any).POST).toBeDefined();
  });

  it("places the handler under the correct protocol key", () => {
    const handler = stubHandler("/things");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/things"),
      handler,
      protocol: "GET",
    });

    const protocols = treeRouteFinder(app.routes, new Path("/things")).unpack() as any;
    expect(protocols.GET).toBeDefined();
    expect(protocols.POST).toBeUndefined();
  });

  it("defaults to 'http' protocol when none is provided", () => {
    const handler = stubHandler("/default");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/default"),
      handler,
    });

    const protocols = treeRouteFinder(app.routes, new Path("/default")).unpack() as any;
    expect(protocols.http).toBeDefined();
  });

  it("supports nested paths", () => {
    const handler = stubHandler("/api/v1/users");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/api/v1/users"),
      handler,
      protocol: "POST",
    });

    expect(treeRouteFinder(app.routes, new Path("/api/v1/users")).isSome()).toBe(true);
  });

  it("two routes on the same path with different protocols coexist", () => {
    const app = BlazyConstructor.createEmpty()
      .addRoute({ routeMatcher: new NormalRouting("/res"), handler: stubHandler("/res"), protocol: "POST" })
      .addRoute({ routeMatcher: new NormalRouting("/res"), handler: stubHandler("/res"), protocol: "GET" });

    const protocols = treeRouteFinder(app.routes, new Path("/res")).unpack() as any;
    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeDefined();
  });

  it("calls the wrapped handleRequest when invoked", () => {
    const received: unknown[] = [];
    const handler: IRouteHandler<any, any> = {
      metadata: { subRoute: "/echo" },
      handleRequest: (arg: any) => { received.push(arg); return arg; },
      getClientRepresentation: () => () => {},
    };

    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/echo"),
      handler,
      protocol: "POST",
    });

    const protocols = treeRouteFinder(app.routes, new Path("/echo")).unpack() as any;
    protocols.POST.handleRequest({ x: 1 });
    expect(received).toEqual([{ x: 1 }]);
  });
});
