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

async function expectRpcResponse(response: unknown, body: unknown) {
  expect(response).toBeInstanceOf(Response);
  expect((response as Response).status).toBe(201);
  await expect((response as Response).json()).resolves.toEqual(body);
}

describe("rpc()", () => {
  it("registers a POST route that is reachable through route()", async () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "doThing",
      handler: () => ({ body: { done: true } }),
    });

    await expectRpcResponse(await callRpc(app, "doThing"), {
      body: { done: true },
    });
  });

  it("uses the rpc name as the route segment", async () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "echo",
      handler: () => ({ body: { route: "echo" } }),
    });

    await expectRpcResponse(await callRpc(app, "echo"), {
      body: { route: "echo" },
    });
  });

  it("two rpc routes do not collide when resolved through route()", async () => {
    const app = BlazyConstructor.createEmpty()
      .rpc({ name: "alpha", handler: () => ({ body: { r: "alpha" } }) })
      .rpc({ name: "beta", handler: () => ({ body: { r: "beta" } }) });

    await expectRpcResponse(await callRpc(app, "alpha"), { body: { r: "alpha" } });
    await expectRpcResponse(await callRpc(app, "beta"), { body: { r: "beta" } });
  });
});
