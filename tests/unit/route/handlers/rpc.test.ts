import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";

// Minimal IFunc-shaped object the rpc methods expect
function makeFunc(name: string, onExecute: (args: unknown) => unknown) {
  return {
    name,
    argsSchema: {},
    returnTypeSchema: {},
    execute: onExecute,
  };
}

describe("RPC routes", () => {
  it("rpcFromFunction registers a handler at POST /rpc/{name} and calls execute with body", () => {
    const received: unknown[] = [];
    const func = makeFunc("internalName", (args) => {
      received.push(args);
      return { body: { ok: true } };
    });

    const app = BlazyConstructor.createEmpty().rpcFromFunction("publicRoute", func);

    // Verify the route exists in the tree
    const result = treeRouteFinder(app.routes, new Path("/rpc/publicRoute"));
    expect(result.isSome()).toBe(true);

    const protocols = result.unpack() as any;
    expect(protocols.POST).toBeDefined();

    // Calling handleRequest should delegate to func.execute
    const response = protocols.POST.handleRequest({ body: { a: 1 } });
    expect(received).toEqual([{ a: 1 }]);
    expect(response).toEqual({ body: { ok: true } });
  });

  it("rpcRoutify registers all provided functions", () => {
    const calls: string[] = [];

    const app = BlazyConstructor.createEmpty().rpcRoutify({
      addUser: makeFunc("addUser", () => { calls.push("addUser"); return { body: { name: "addUser" } }; }) as any,
      deleteUser: makeFunc("deleteUser", () => { calls.push("deleteUser"); return { body: { name: "deleteUser" } }; }) as any,
    });

    const addUserProtocols = treeRouteFinder(app.routes, new Path("/rpc/addUser")).unpack() as any;
    const deleteUserProtocols = treeRouteFinder(app.routes, new Path("/rpc/deleteUser")).unpack() as any;

    addUserProtocols.POST.handleRequest({ body: {} });
    deleteUserProtocols.POST.handleRequest({ body: {} });

    expect(calls).toEqual(["addUser", "deleteUser"]);
  });

  it("rpc() shorthand registers a POST handler at /rpc/{name}", () => {
    let called = false;

    const app = BlazyConstructor.createEmpty().rpc({
      name: "ping",
      handler: () => { called = true; return { body: { pong: true } }; },
    });

    const protocols = treeRouteFinder(app.routes, new Path("/rpc/ping")).unpack() as any;
    expect(protocols.POST).toBeDefined();

    protocols.POST.handleRequest({});
    expect(called).toBe(true);
  });

  it("client exposes rpc routes under routes.rpc.{name}['/'].POST", () => {
    const app = BlazyConstructor.createEmpty().rpcFromFunction(
      makeFunc("greet", () => ({ body: { greeting: "hi" } })) as any,
    );

    const client = app.createClient().createClient()("http://localhost:3000");

    expect((client.routes as any).rpc.greet["/"]).toBeDefined();
    expect((client.routes as any).rpc.greet["/"].POST).toBeDefined();
  });

  it("multiple rpc routes do not interfere with each other", () => {
    const aResult = { body: { from: "a" } };
    const bResult = { body: { from: "b" } };

    const app = BlazyConstructor.createEmpty()
      .rpcFromFunction( makeFunc("a", () => aResult) as any)
      .rpcFromFunction( makeFunc("b", () => bResult) as any);

    const aProto = treeRouteFinder(app.routes, new Path("/rpc/a")).unpack() as any;
    const bProto = treeRouteFinder(app.routes, new Path("/rpc/b")).unpack() as any;

    expect(aProto.POST.handleRequest({})).toEqual(aResult);
    expect(bProto.POST.handleRequest({})).toEqual(bResult);
  });
});
