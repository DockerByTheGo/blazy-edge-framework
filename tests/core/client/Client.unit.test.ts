import { describe, expect, it } from "vitest";

import { Client } from "src/client/Client";

import { makeMockHandler, protocolLeaf } from "./clientTestHelpers";
import { BlazyConstructor } from "src";
import z from "zod/v4";

describe("client", () => {
  it("exposes a route at the correct nested path", () => {
    const handler = makeMockHandler<{ name: string }, { id: number }>("/api/users", { id: 1 });
    const tree = { api: { users: protocolLeaf("POST", handler) } };

    const client = new Client(tree, "http://localhost:3000");

    // Full intellisense: client.invoke.api.users["/"].POST is typed as
    // (arg: { name: string }) => Promise<{ id: number }>
    expect(client.invoke.api.users["/"]).toBeDefined();
    expect(client.invoke.api.users["/"].POST).toBeDefined();
  });

  it("the client fn is callable and returns the mocked response", async () => {
    const handler = makeMockHandler<{ qty: number }, { created: boolean }>("/orders", { created: true });
    const tree = { orders: protocolLeaf("POST", handler) };

    const client = new Client(tree, "http://localhost:3000");

    // intellisense knows this is (arg: { qty: number }) => Promise<IMapable<{ created: boolean }>>
    const result = await client.invoke.orders["/"].POST({ qty: 3 });

    expect(result.raw).toEqual({ created: true });
  });

  it("multiple protocols on the same path are both built", () => {
    const postHandler = makeMockHandler<{ body: string }, { ok: boolean }>("/things", { ok: true });
    const getHandler = makeMockHandler<void, { items: string[] }>("/things", { items: [] });

    const tree = {
      things: {
        "/": { POST: postHandler, GET: getHandler },
      } as {
        "/": { POST: typeof postHandler; GET: typeof getHandler };
      },
    };

    const client = new Client(tree, "http://localhost:3000");

    // intellisense: POST and GET are distinct typed fns
    expect(client.invoke.things["/"].POST).toBeDefined();
    expect(client.invoke.things["/"].GET).toBeDefined();
  });

  it("deeply nested routes are reachable", () => {
    const handler = makeMockHandler<{ x: number }, { y: number }>("/a/b/c", { y: 42 });
    const tree = { a: { b: { c: protocolLeaf("POST", handler) } } };

    const client = new Client(tree, "http://localhost:3000");

    // intellisense resolves all three levels
    expect(client.invoke.a.b.c["/"].POST).toBeDefined();
  });

  it("correctly sends a request", async () => {
    const app = BlazyConstructor
    .createProd()
    .get({
      path: "/test",
      handler: () => ({ success: true }),
      args: z.object({})
    })

    const port = 3005

    const client = app.createClient().createClient()("http://localhost:"+ port);

    app.listen(3005)
    console.log("frfr")
   await new Promise(resolve => setTimeout(resolve, 3000)); 
   
    console.log("frfr")
   

    const g = await client.invoke.test["/"].GET()
    console.log("gg", g);
    expect(g.raw).toEqual({ success: true });
  })
});
