import { describe, expect, expectTypeOf, it, vi } from "vitest";
import z from "zod/v4";

import { WebsocketRouteHandler } from "src/route/handlers/variations/websocket";
import type { Schema } from "src/route/handlers/variations/websocket/types";
import { Message } from "src/route/handlers/variations/websocket/types";

describe("WebsocketRouteHandler", () => {
  it("getClientRepresentation exposes send and handle client proxies", () => {
    const incomingSchema = z.object({ name: z.string(), password: z.string() });
    const outgoingSchema = z.object({ name: z.string() });
    const handler = new WebsocketRouteHandler({
      messagesItCanRecieve: {
        new: new Message(incomingSchema, () => {}),
      },
      messagesItCanSend: {
        joined: new Message(outgoingSchema, () => {}),
      },
    }, { subRoute: "/chat" });

    const client = handler.getClientRepresentation({ serverUrl: "http://localhost:3000", subRoute: "/chat" });

    expect(client.handle.joined).toBeFunction();
    expect(client.send.new).toBeFunction();
    expectTypeOf(client.send.new).parameters.toEqualTypeOf<[{ name: string; password: string }]>();
    type JoinedCtx = Parameters<Parameters<typeof client.handle.joined>[0]>[0];
    expectTypeOf<JoinedCtx["message"]["body"]["get"]>().parameters.toEqualTypeOf<["name"]>();
    expectTypeOf<ReturnType<JoinedCtx["message"]["body"]["get"]>>().toEqualTypeOf<string>();
  });

  it("handleRequest sends a failed validation message back to the websocket host", () => {
    const send = vi.fn();
    const handler = new WebsocketRouteHandler({
      messagesItCanRecieve: {
        ping: new Message(z.object({ id: z.string() }), () => {}),
      },
      messagesItCanSend: {},
    }, { subRoute: "/chat" });

    const response = handler.handleRequest({
      type: "ping",
      path: "/chat",
      body: { id: 123 },
      ws: { send } as any,
    });

    expect(response.type).toBe("validation_failed");
    expect(send).toHaveBeenCalledOnce();
    expect(JSON.parse(send.mock.calls[0]?.[0] as string)).toMatchObject({
      type: "validation_failed",
      body: {
        fieldErrors: {
          id: expect.any(Array),
        },
      },
    });
  });

  it("handleRequest invokes message handlers with body and params", () => {
    const messageHandler = vi.fn();
    const joinSchema = z.object({ userId: z.string() });
    const schema = {
      messagesItCanRecieve: {
        join: new Message<{ roomId: string }, typeof joinSchema>(
          joinSchema,
          ({ message }) => {
            expectTypeOf(message.body.get("userId")).toEqualTypeOf<string>();
            expectTypeOf(message.params.get("roomId")).toEqualTypeOf<string>();
            messageHandler({
              roomId: message.params.get("roomId"),
              userId: message.body.get("userId"),
            });
          },
        ),
      },
      messagesItCanSend: {},
    } satisfies Schema<{ params: { roomId: string } }>;
    const handler = new WebsocketRouteHandler(schema, { subRoute: "/rooms/:roomId" });

    handler.handleRequest({
      type: "join",
      path: "/rooms/123",
      body: { userId: "u_1" },
      params: { roomId: "123" },
      ws: { send: vi.fn() } as any,
    });

    expect(messageHandler).toHaveBeenCalledWith({
      roomId: "123",
      userId: "u_1",
    });
  });

  it("handleRequest sends contract messages from the websocket context", () => {
    const send = vi.fn();
    const handler = new WebsocketRouteHandler({
      messagesItCanRecieve: {
        join: new Message(
          z.object({ userId: z.string() }),
          ({ message, ws }) => {
            ws.message("joined", {
              roomId: message.params.get("roomId"),
              userId: message.body.get("userId"),
            });
          },
        ),
      },
      messagesItCanSend: {
        joined: new Message(
          z.object({ roomId: z.string(), userId: z.string() }),
          () => {},
        ),
      },
    }, { subRoute: "/rooms/:roomId" });

    handler.handleRequest({
      type: "join",
      path: "/rooms/123",
      body: { userId: "u_1" },
      params: { roomId: "123" },
      ws: { send } as any,
    });

    expect(send).toHaveBeenCalledWith(JSON.stringify({
      body: {
        roomId: "123",
        userId: "u_1",
      },
      path: "/rooms/:roomId",
      type: "joined",
    }));
  });
});
