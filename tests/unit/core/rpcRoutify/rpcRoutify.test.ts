import { describe, it, expect } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";

function makeFunc(name: string, execute: (args: any) => any) {
  return { name, argsSchema: {}, returnTypeSchema: {}, execute };
}

describe("rpcRoutify()", () => {
  it("registers all provided functions as POST routes", () => {
    const app = BlazyConstructor.createEmpty().rpcRoutify({
      addUser:    makeFunc("addUser",    () => ({})) as any,
      deleteUser: makeFunc("deleteUser", () => ({})) as any,
    });

    expect(treeRouteFinder(app.routes, new Path("/rpc/addUser")).isSome()).toBe(true);
    expect(treeRouteFinder(app.routes, new Path("/rpc/deleteUser")).isSome()).toBe(true);
  });

  it("each function is called independently", () => {
    const calls: string[] = [];

    const app = BlazyConstructor.createEmpty().rpcRoutify({
      a: makeFunc("a", () => { calls.push("a"); return {}; }) as any,
      b: makeFunc("b", () => { calls.push("b"); return {}; }) as any,
    });

    (treeRouteFinder(app.routes, new Path("/rpc/a")).unpack() as any).POST.handleRequest({ body: {} });
    (treeRouteFinder(app.routes, new Path("/rpc/b")).unpack() as any).POST.handleRequest({ body: {} });

    expect(calls).toEqual(["a", "b"]);
  });

  it("routes from rpcRoutify do not overwrite each other", () => {
    const app = BlazyConstructor.createEmpty().rpcRoutify({
      x: makeFunc("x", () => ({ body: { from: "x" } })) as any,
      y: makeFunc("y", () => ({ body: { from: "y" } })) as any,
    });

    const xResult = (treeRouteFinder(app.routes, new Path("/rpc/x")).unpack() as any).POST.handleRequest({ body: {} });
    const yResult = (treeRouteFinder(app.routes, new Path("/rpc/y")).unpack() as any).POST.handleRequest({ body: {} });

    expect(xResult).toEqual({ body: { from: "x" } });
    expect(yResult).toEqual({ body: { from: "y" } });
  });
});
