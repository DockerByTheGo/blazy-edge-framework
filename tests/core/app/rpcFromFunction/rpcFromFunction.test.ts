import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

import { getProtocols } from "../utils/routeTree";

function makeFunc(name: string, execute: (args: any) => any) {
  return { name, argsSchema: {}, returnTypeSchema: {}, execute };
}

describe("rpcFromFunction()", () => {
  it("registers the route directly in the router tree under POST", () => {
    const func = makeFunc("createOrder", () => ({ body: { id: 1 } }));
    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);

    const protocols = getProtocols(app.routes, "/rpc/createOrder");

    expect(app.routes.rpc.createOrder).toHaveProperty("/");
    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.metadata).toMatchObject({
      subRoute: "/rpc/createOrder",
      verb: "POST",
      protocol: "POST",
    });
  });

  it("uses func.name as the route segment", () => {
    const func = makeFunc("myFunc", () => ({}));
    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);

    const protocols = getProtocols(app.routes, "/rpc/myFunc");

    expect(protocols.POST).toBeDefined();
    expect(app.routes.rpc).toHaveProperty("myFunc");
    expect(app.routes.rpc).not.toHaveProperty("somethingElse");
  });

  it("registers a callable POST route handler", () => {
    const func = makeFunc("process", () => ({ body: { ok: true } }));

    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);
    const protocols = getProtocols(app.routes, "/rpc/process");

    expect(protocols.POST.handleRequest).toBeTypeOf("function");
    expect(protocols.POST.metadata.subRoute).toBe("/rpc/process");
  });

  it("does not register sibling routes when only one function is added", () => {
    const func = makeFunc("noBody", () => ({}));

    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);
    const protocols = getProtocols(app.routes, "/rpc/noBody");

    expect(protocols.POST).toBeDefined();
    expect(app.routes.rpc).not.toHaveProperty("process");
  });
});
