import type { IRouteHandler } from "@blazyts/backend-lib/src/core/server";

import { describe, expect, it } from "vitest";

import { CleintBuilderConstructors, ClientBuilder } from "src/client/client-builder/clientBuilder";

import { makeMockHandler, protocolLeaf, type RuntimeMeta } from "./clientTestHelpers";

describe("clientBuilder", () => {
  describe("cleintBuilderConstructors", () => {
    it("empty() returns a ClientBuilder instance", () => {
      const builder = CleintBuilderConstructors.empty();
      expect(builder).toBeInstanceOf(ClientBuilder);
    });

    it("fromRouteTree() returns a ClientBuilder instance", () => {
      const handler = makeMockHandler<{ name: string }, { id: number }>("/users", { id: 1 });
      const tree = { users: protocolLeaf("POST", handler) };

      const builder = CleintBuilderConstructors.fromRouteTree(tree);
      expect(builder).toBeInstanceOf(ClientBuilder);
    });

    it("static empty() also returns a ClientBuilder instance", () => {
      const builder = ClientBuilder.empty();
      expect(builder).toBeInstanceOf(ClientBuilder);
    });
  });

  describe("createClient()", () => {
    it("client built from a route tree exposes the routes", () => {
      const handler = makeMockHandler<{ name: string }, { id: number }>("/users", { id: 1 });
      const tree = { users: protocolLeaf("POST", handler) };

      const client = CleintBuilderConstructors.fromRouteTree(tree).createClient()("http://localhost:3000");

      expect(client.invoke.users["/"]).toBeDefined();
      expect(client.invoke.users["/"].POST).toBeDefined();
    });

    it("calling createClient() twice produces independent Client instances", () => {
      const factory = CleintBuilderConstructors.empty().createClient();
      const a = factory("http://a.com");
      const b = factory("http://b.com");

      expect(a).not.toBe(b);
      expect(a.url).toBe("http://a.com");
      expect(b.url).toBe("http://b.com");
    });

    it("applies beforeSend and afterReceive hooks around route calls", async () => {
      const received: unknown[] = [];
      const handler = {
        metadata: { subRoute: "/users", verb: "POST" as const },
        handleRequest: () => ({ body: { ok: true } }),
        getClientRepresentation: (_meta: RuntimeMeta) => async (arg: { name: string; normalized?: boolean }) => {
          received.push(arg);
          return { body: { ok: true } };
        },
      } satisfies IRouteHandler<any, any>;
      const tree = { users: protocolLeaf("POST", handler) };

      const client = CleintBuilderConstructors
        .fromRouteTree(tree)
        .beforeSend((arg: { name: string }) => ({ ...arg, normalized: true }), "normalize")
        .afterReceive((arg: { response: { body: { ok: boolean } } }) => arg.response.body, "unwrapBody")
        .createClient()("http://localhost:3000");
      const result = await client.invoke.users["/"].POST({ name: "alice" });

      expect(received).toEqual([{ name: "alice", normalized: true }]);
      expect(result.raw).toEqual({ ok: true });
    });
  });
});
