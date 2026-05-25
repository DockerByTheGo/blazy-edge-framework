import type { IMapable } from "@blazyts/better-standard-library";

import { describe, expectTypeOf, it } from "vitest";

import type { Client } from "src/client/Client";

import { CleintBuilderConstructors } from "src/client/client-builder/clientBuilder";

import { makeMockHandler, protocolLeaf } from "./clientTestHelpers";

describe("clientBuilder types", () => {
  it("client.invoke from builder preserves the route tree type", () => {
    const handler = makeMockHandler<{ name: string }, { id: number }>("/users", { id: 1 });
    const tree = { users: protocolLeaf("POST", handler) };

    const client = CleintBuilderConstructors.fromRouteTree(tree).createClient()("http://localhost:3000");

    expectTypeOf(client.invoke.users["/"].POST).parameters.toEqualTypeOf<[{ name: string }]>();
    expectTypeOf(client.invoke.users["/"].POST).returns.toEqualTypeOf<Promise<IMapable<{ id: number }>>>();
  });

  it("empty builder produces Client<{}>", () => {
    const client = CleintBuilderConstructors.empty().createClient()("http://localhost:3000");

    expectTypeOf(client).toEqualTypeOf<Client<{}>>();
  });
});
