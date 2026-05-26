import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

import { getProtocols } from "../utils/routeTree";

function makeFunc(name: string, execute: (args: any) => any) {
  return { name, argsSchema: {}, returnTypeSchema: {}, execute };
}

describe("rpcRoutify()", () => {
  it("registers all provided functions directly in the router tree under POST", () => {
    const app = BlazyConstructor.createEmpty().rpcRoutify({
      addUser: makeFunc("addUser", () => ({})) as any,
      deleteUser: makeFunc("deleteUser", () => ({})) as any,
    });

    const addUserProtocols = getProtocols(app.routes, "/rpc/addUser");
    const deleteUserProtocols = getProtocols(app.routes, "/rpc/deleteUser");

    expect(app.routes.rpc.addUser).toHaveProperty("/");
    expect(app.routes.rpc.deleteUser).toHaveProperty("/");
    expect(addUserProtocols.POST).toBeDefined();
    expect(deleteUserProtocols.POST).toBeDefined();
  });

  it("each function gets its own route branch", () => {
    const app = BlazyConstructor.createEmpty().rpcRoutify({
      a: makeFunc("a", () => ({})) as any,
      b: makeFunc("b", () => ({})) as any,
    });

    const aProtocols = getProtocols(app.routes, "/rpc/a");
    const bProtocols = getProtocols(app.routes, "/rpc/b");

    expect(aProtocols.POST).toBeDefined();
    expect(bProtocols.POST).toBeDefined();
    expect(aProtocols.POST).not.toBe(bProtocols.POST);
    expect(aProtocols.POST.metadata.subRoute).toBe("/rpc/a");
    expect(bProtocols.POST.metadata.subRoute).toBe("/rpc/b");
  });

  it("routes from rpcRoutify do not overwrite each other", () => {
    const app = BlazyConstructor.createEmpty().rpcRoutify({
      x: makeFunc("x", () => ({ body: { from: "x" } })) as any,
      y: makeFunc("y", () => ({ body: { from: "y" } })) as any,
    });

    const xProtocols = getProtocols(app.routes, "/rpc/x");
    const yProtocols = getProtocols(app.routes, "/rpc/y");

    expect(xProtocols.POST).toBeDefined();
    expect(yProtocols.POST).toBeDefined();
    expect(xProtocols.POST.metadata.subRoute).toBe("/rpc/x");
    expect(yProtocols.POST.metadata.subRoute).toBe("/rpc/y");
  });
});
