import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

type RoutableApp = {
  route: (request: { reqData: any }) => Promise<unknown>;
};

function callRpc(app: RoutableApp, name: string, body: unknown = {}) {
  return app.route({
    reqData: {
      url: `/rpc/${name}`,
      protocol: "POST",
      verb: "POST",
      body,
      headers: {},
    },
  });
}

describe("rpc()", () => {
  it("registers a POST route that is reachable through route()", async () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "doThing",
      handler: () => ({ body: { done: true } }),
    });

    await expect(callRpc(app, "doThing")).resolves.toEqual({
      body: { done: true },
    });
  });

  it("uses the rpc name as the route segment", async () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "echo",
      handler: () => ({ body: { route: "echo" } }),
    });

    await expect(callRpc(app, "echo")).resolves.toEqual({
      body: { route: "echo" },
    });
  });

  it("two rpc routes do not collide when resolved through route()", async () => {
    const app = BlazyConstructor.createEmpty()
      .rpc({ name: "alpha", handler: () => ({ body: { r: "alpha" } }) })
      .rpc({ name: "beta", handler: () => ({ body: { r: "beta" } }) });

    await expect(callRpc(app, "alpha")).resolves.toEqual({ body: { r: "alpha" } });
    await expect(callRpc(app, "beta")).resolves.toEqual({ body: { r: "beta" } });
  });
});
