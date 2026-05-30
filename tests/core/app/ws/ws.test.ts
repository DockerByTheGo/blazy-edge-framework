import { describe, expect, expectTypeOf, it, vi } from "vitest";
import z from "zod/v4";

import { BlazyConstructor } from "src/app/constructors";
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

    const protocols = getProtocols(app.routes, "/rooms/:roomId");

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
            ({ message }) => {
              expectTypeOf(message.body.get("roomId")).toEqualTypeOf<string>();
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

    type ExpectedRoomJoinedHandler = (ctx: {
      message: {
        body: {
          get: <K extends "roomId" | "members">(v: K) => {
            roomId: string;
            members: number;
          }[K];
        };
        params: {
          raw: () => Record<string, unknown>;
        };
      };
      ws: WebSocket;
    }) => void;

    expectTypeOf(client.invoke.rooms["/"].ws.handle["room-joined"])
      .parameters
      .toMatchObjectType<[ExpectedRoomJoinedHandler]>();
  });

  it("contextually types inline message handlers from their schema", () => {
    BlazyConstructor.createEmpty().ws({
      path: "/inline",
      messages: {
        messagesItCanRecieve: {
          ping: {
            schema: z.object({ id: z.string(), count: z.number() }),
            handler: ({ message }) => {
              expectTypeOf(message.body).not.toBeAny();
              expectTypeOf(message.body.get("id")).toEqualTypeOf<string>();
              expectTypeOf(message.body.get("count")).toEqualTypeOf<number>();
            },
          },
        },
        messagesItCanSend: {},
      },
    });
  });

  it("ws and post on the same path coexist in the router tree", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/dual", handler: () => ({ body: {} }) })
      .ws({ path: "/dual", messages: { messagesItCanRecieve: {}, messagesItCanSend: {} } });

    const protocols = getProtocols(app.routes, "/dual");

    expect(protocols.POST).toBeDefined();
    expect(protocols.ws).toBeDefined();
    expect(protocols.POST).not.toBe(protocols.ws);
  });
});
