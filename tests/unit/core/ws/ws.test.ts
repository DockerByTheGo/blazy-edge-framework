import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import z from "zod/v4";

import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders";
import { Message } from "src/route/handlers/variations/websocket/types";

import { getProtocols } from "../utils/routeTree";

describe("ws()", () => {
  it("registers the route directly in the router tree under ws", () => {
    const app = BlazyConstructor.createEmpty().ws({
      path: "/chat",
      messages: {
        messagesItCanRecieve: {},
        messagesItCanSend: {},
      },
    });

    const protocols = getProtocols(app.routes, "/chat");

    expect(app.routes).toHaveProperty("chat");
    expect(app.routes.chat).toHaveProperty("/");
    expect(protocols.ws).toBeDefined();
    expect(protocols.ws.metadata.subRoute).toBe("/chat");
  });

  it("does not register under POST or GET", () => {
    const app = BlazyConstructor.createEmpty().ws({
      path: "/stream",
      messages: { messagesItCanRecieve: {}, messagesItCanSend: {} },
    });

    const protocols = getProtocols(app.routes, "/stream");

    expect(protocols.ws).toBeDefined();
    expect(protocols.POST).toBeUndefined();
    expect(protocols.GET).toBeUndefined();
  });

  it("stores the message schema on the handler", () => {
    const handler = vi.fn();
    const app = BlazyConstructor.createEmpty().ws({
      path: "/events",
      messages: {
        messagesItCanRecieve: {
          ping: new Message(z.object({ id: z.string() }), handler),
        },
        messagesItCanSend: {},
      },
    });

    const protocols = getProtocols(app.routes, "/events");
    expect(protocols.ws.schema.messagesItCanRecieve.ping).toBeDefined();
  });

  it("supports dynamic paths like the http route methods", () => {
    const handler = vi.fn();
    const app = BlazyConstructor.createEmpty().ws({
      path: "/rooms/:roomId",
      messages: {
        messagesItCanRecieve: {
          join: new Message(z.object({ userId: z.string() }), handler),
        },
        messagesItCanSend: {},
      },
    });

    const protocols = treeRouteFinder(app.routes, new Path("/rooms/123"))
      .expect("Expected dynamic ws route to be found");

    expect(protocols.ws).toBeDefined();
    expect(protocols.ws.metadata.subRoute).toBe("/rooms/:roomId");
  });

  it("keeps message schema types on the generated client", () => {
    const app = BlazyConstructor.createEmpty().ws({
      path: "/rooms",
      messages: {
        messagesItCanRecieve: {
          "join-room": new Message(
            z.object({ roomId: z.string() }),
            ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ roomId: string }>();
            },
          ),
        },
        messagesItCanSend: {
          "room-joined": new Message(
            z.object({ roomId: z.string(), members: z.number() }),
            () => {},
          ),
        },
      },
    });

    const client = app.createClient().createClient()("http://localhost:3000");

    expectTypeOf(client.invoke.rooms["/"].ws.send["join-room"])
      .parameters
      .toEqualTypeOf<[{ roomId: string }]>();

    expectTypeOf(client.invoke.rooms["/"].ws.handle["room-joined"])
      .parameters
      .toEqualTypeOf<[(ctx: { data: { roomId: string; members: number }; ws: WebSocket }) => void]>();
  });

  it("contextually types inline message handlers from their schema", () => {
    BlazyConstructor.createEmpty().ws({
      path: "/inline",
      messages: {
        messagesItCanRecieve: {
          ping: {
            schema: z.object({ id: z.string(), count: z.number() }),
            handler: ({ data }) => {
              expectTypeOf(data).not.toBeAny();
              expectTypeOf(data).toEqualTypeOf<{ id: string; count: number }>();
            },
          },
        },
        messagesItCanSend: {},
      },
    });
  });

  it("ws and post on the same path coexist in the router tree", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/dual", handeler: () => ({ body: {} }) })
      .ws({ path: "/dual", messages: { messagesItCanRecieve: {}, messagesItCanSend: {} } });

    const protocols = getProtocols(app.routes, "/dual");

    expect(protocols.POST).toBeDefined();
    expect(protocols.ws).toBeDefined();
    expect(protocols.POST).not.toBe(protocols.ws);
  });
});
