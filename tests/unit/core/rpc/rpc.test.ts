import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

import { getProtocols } from "../utils/routeTree";

describe("rpc()", () => {
  it("registers the route directly in the router tree under POST", () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "doThing",
      handler: () => ({ body: { done: true } }),
    });

    const protocols = getProtocols(app.routes, "/rpc/doThing");

    expect(app.routes.rpc.doThing).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata).toMatchObject({
      subRoute: "/rpc/doThing",
      verb: "POST",
      protocol: "POST",
    });
  });

  it("uses the rpc name as the route segment", () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "echo",
      handler: () => ({ body: {} }),
    });

    const protocols = getProtocols(app.routes, "/rpc/echo");

    expect(app.routes.rpc.echo).toHaveProperty("/");
    expect(app.routes.rpc).not.toHaveProperty("somethingElse");
    expect(protocols.POST.metadata.subRoute).toBe("/rpc/echo");
  });

  it("two rpc routes do not collide in the router tree", () => {
    const app = BlazyConstructor.createEmpty()
      .rpc({ name: "alpha", handler: () => ({ body: { r: "alpha" } }) })
      .rpc({ name: "beta", handler: () => ({ body: { r: "beta" } }) });

    const alphaProtocols = getProtocols(app.routes, "/rpc/alpha");
    const betaProtocols = getProtocols(app.routes, "/rpc/beta");

    expect(alphaProtocols.POST).toBeDefined();
    expect(betaProtocols.POST).toBeDefined();
    expect(alphaProtocols.POST).not.toBe(betaProtocols.POST);
    expect(alphaProtocols.POST.metadata.subRoute).toBe("/rpc/alpha");
    expect(betaProtocols.POST.metadata.subRoute).toBe("/rpc/beta");
  });
});
