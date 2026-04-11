import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";

function makeFunc(name: string, execute: (args: any) => any) {
  return { name, argsSchema: {}, returnTypeSchema: {}, execute };
}

describe("rpcFromFunction()", () => {
  it("registers a POST handler at /rpc/{func.name}", () => {
    const func = makeFunc("createOrder", () => ({ body: { id: 1 } }));
    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);

    expect(treeRouteFinder(app.routes, new Path("/rpc/createOrder")).isSome()).toBe(true);
  });

  it("uses func.name as the route segment", () => {
    const func = makeFunc("myFunc", () => ({}));
    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);

    expect(treeRouteFinder(app.routes, new Path("/rpc/myFunc")).isSome()).toBe(true);
    expect(treeRouteFinder(app.routes, new Path("/rpc/somethingElse")).isSome()).toBe(false);
  });

  it("delegates to func.execute with the request body", () => {
    const received: unknown[] = [];
    const func = makeFunc("process", (args) => { received.push(args); return { body: { ok: true } }; });

    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);
    const protocols = treeRouteFinder(app.routes, new Path("/rpc/process")).unpack() as any;

    protocols.POST.handleRequest({ body: { x: 42 } });
    expect(received).toEqual([{ x: 42 }]);
  });

  it("falls back to empty object when body is absent", () => {
    const received: unknown[] = [];
    const func = makeFunc("noBody", (args) => { received.push(args); return {}; });

    const app = BlazyConstructor.createEmpty().rpcFromFunction(func as any);
    const protocols = treeRouteFinder(app.routes, new Path("/rpc/noBody")).unpack() as any;

    protocols.POST.handleRequest({});
    expect(received).toEqual([{}]);
  });
});
