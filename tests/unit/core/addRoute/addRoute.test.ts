import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import type { IRouteHandler, IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import { NormalRouting } from "src/route/matchers/normal";
import { getProtocols } from "../utils/routeTree";

function stubHandler(subRoute: string): IRouteHandler<any, any> {
  return {
    metadata: { subRoute },
    handleRequest: (arg: any) => arg,
    getClientRepresentation: (_meta: IRouteHandlerMetadata) => () => {},
  };
}

describe("addRoute", () => {
  it("registers the route directly in the router tree", () => {
    const handler = stubHandler("/items");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/items"),
      handler,
      protocol: "POST",
    });

    const protocols = getProtocols(app.routes, "/items");

    expect(app.routes).toHaveProperty("items");
    expect(app.routes.items).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata.subRoute).toBe("/items");
  });

  it("places the handler under the correct protocol key", () => {
    const handler = stubHandler("/things");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/things"),
      handler,
      protocol: "GET",
    });

    const protocols = getProtocols(app.routes, "/things");
    expect(protocols.GET).toBeDefined();
    expect(protocols.POST).toBeUndefined();
  });

  it("defaults to 'http' protocol when none is provided", () => {
    const handler = stubHandler("/default");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/default"),
      handler,
    });

    const protocols = getProtocols(app.routes, "/default");
    expect(protocols.http).toBeDefined();
  });

  it("supports nested paths", () => {
    const handler = stubHandler("/api/v1/users");
    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/api/v1/users"),
      handler,
      protocol: "POST",
    });

    const protocols = getProtocols(app.routes, "/api/v1/users");

    expect(app.routes.api.v1.users).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata.subRoute).toBe("/api/v1/users");
  });

  it("two routes on the same path with different protocols coexist", () => {
    const app = BlazyConstructor.createEmpty()
      .addRoute({ routeMatcher: new NormalRouting("/res"), handler: stubHandler("/res"), protocol: "POST" })
      .addRoute({ routeMatcher: new NormalRouting("/res"), handler: stubHandler("/res"), protocol: "GET" });

    const protocols = getProtocols(app.routes, "/res");
    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeDefined();
    expect(protocols.POST).not.toBe(protocols.GET);
  });

  it("keeps the registered handler under the protocol key", () => {
    const handler: IRouteHandler<any, any> = {
      metadata: { subRoute: "/echo" },
      handleRequest: (arg: any) => arg,
      getClientRepresentation: () => () => {},
    };

    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/echo"),
      handler,
      protocol: "POST",
    });

    const protocols = getProtocols(app.routes, "/echo");

    expect(protocols.POST.handleRequest).toBeTypeOf("function");
    expect(protocols.POST.metadata.subRoute).toBe("/echo");
  });
});
