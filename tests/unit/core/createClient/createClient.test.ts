import { describe, expect, expectTypeOf, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";
import { Client } from "src/client/Client";
import { ClientBuilder } from "src/client/client-builder/clientBuilder";

describe("createClient()", () => {
  it("returns a ClientBuilder instance", () => {
    const builder = BlazyConstructor.createEmpty().createClient();
    expect(builder).toBeInstanceOf(ClientBuilder);
  });

  it("the builder produces a Client when given a url", () => {
    const client = BlazyConstructor.createEmpty()
      .createClient()
      .createClient()("http://localhost:3000");

    expect(client).toBeInstanceOf(Client);
    expect(client.url).toBe("http://localhost:3000");
  });

  it("routes registered on the app are accessible on the client", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/api/items",
      handeler: () => ({ body: { ok: true } }),
    });

    const client = app.createClient().createClient()("http://localhost:3000");

    expect((client.invoke as any).api.items["/"]).toBeDefined();
    expect((client.invoke as any).api.items["/"].POST).toBeDefined();
  });

  it("client url is forwarded to getClientRepresentation as serverUrl", () => {
    const receivedUrls: string[] = [];

    // Use a raw addRoute with a spy handler to capture the serverUrl
    const { NormalRouting } = require("src/route/matchers/normal");
    const spyHandler = {
      metadata: { subRoute: "/spy" },
      handleRequest: () => ({}),
      getClientRepresentation: (meta: any) => {
        receivedUrls.push(meta.serverUrl);
        return () => {};
      },
    };

    const app = BlazyConstructor.createEmpty().addRoute({
      routeMatcher: new NormalRouting("/spy"),
      handler: spyHandler,
      protocol: "POST",
    });

    app.createClient().createClient()("http://my-server.com");

    expect(receivedUrls).toContain("http://my-server.com/spy");
  });

  it("createClient type: builder is not any", () => {
    const builder = BlazyConstructor.createEmpty().createClient();
    expectTypeOf(builder).not.toBeAny();
  });
});
