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

describe("rPC routes", () => {
  it("rpc() invokes the registered handler through route()", async () => {
    let called = false;

    const app = BlazyConstructor.createEmpty().rpc({
      name: "ping",
      handler: () => {
        called = true;
        return { body: { pong: true } };
      },
    });

    await expect(callRpc(app, "ping")).resolves.toEqual({
      body: { pong: true },
    });
    expect(called).toBe(true);
  });

  it("passes the routed request data to the rpc handler", async () => {
    const received: unknown[] = [];
    const app = BlazyConstructor.createEmpty().rpc({
      name: "echo",
      handler: (ctx: any) => {
        received.push(ctx.request.body);
        return { body: ctx.request.body };
      },
    });

    await expect(callRpc(app, "echo", { a: 1 })).resolves.toEqual({
      body: { a: 1 },
    });
    expect(received).toEqual([{ a: 1 }]);
  });

  it("keeps multiple rpc routes independent when resolved through route()", async () => {
    const app = BlazyConstructor.createEmpty()
      .rpc({ name: "a", handler: () => ({ body: { from: "a" } }) })
      .rpc({ name: "b", handler: () => ({ body: { from: "b" } }) });

    await expect(callRpc(app, "a")).resolves.toEqual({ body: { from: "a" } });
    await expect(callRpc(app, "b")).resolves.toEqual({ body: { from: "b" } });
  });

  it("exposes rpc routes on the generated client", () => {
    const app = BlazyConstructor.createEmpty().rpc({
      name: "greet",
      handler: () => ({ body: { greeting: "hi" } }),
    });

    const client = app.createClient().createClient()("http://localhost:3000");

    expect((client.invoke as any).rpc.greet["/"]).toBeDefined();
    expect((client.invoke as any).rpc.greet["/"].POST).toBeDefined();
  });
});
