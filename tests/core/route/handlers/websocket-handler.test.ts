import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import z from "zod/v4";

import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { WebsocketRouteHandler } from "src/route/handlers/variations/websocket";
import { Message } from "src/route/handlers/variations/websocket/types";

describe("WebsocketRouteHandler", () => {
  const newMEssageSchema = z.object({ name: z.string(), password: z.string() });
  const joinedSchema = z.object({ name: z.string() });
  const handler = new WebsocketRouteHandler({
    messagesItCanRecieve: {
      new: new Message(
        newMEssageSchema,
        v => ({ new: "" }),
      ),
    },
    messagesItCanSend: {
      joined: new Message(
        joinedSchema,
        v => v.message.body,
      ),
    },
  }, {});

  const client = handler.getClientRepresentation({ serverUrl: "http://localhost:3000" });

  it("exposes getClientRepresentation and send/handle proxies", async () => {
    const expectedHndle = {
      joined: (arg) => { },
    };

    const expectedSend = {
      new: (arg) => { },
    };

    expect(client.handle.joined).toBeFunction();
    expect(client.send.new).toBeFunction();
  });

  it("exposes a correctly typed cleint", () => {
    type expectedType = {
      handle: {
        joined: Message<typeof joinedSchema>;
      };
      send: {
        new: Message<typeof newMEssageSchema>;
      };
    };
    expectTypeOf(client).toMatchObjectType<expectedType>();
  });
  it("registers a ws handler when using Blazy.ws", () => {
    const pingSchema = z.object({ text: z.string() });
    const app = BlazyConstructor
      .createEmpty()
      .ws({
        path: "/chat",
        messages: {
          messagesItCanRecieve: {
            ping: new Message(pingSchema, () => ({ pinged: true })),
          },
          messagesItCanSend: {
            pong: new Message(pingSchema, ({ message }) => message.body),
          },
        },
      });

    const handler = treeRouteFinder(app.routes, new Path("/chat"))
      .expect("Expected ws handler to be registered under /chat")
      .valueOf() as any;

    expect(handler.ws).toBeDefined();
    expect(handler.ws.handleRequest).toBeFunction();
    expect(handler.ws.getClientRepresentation).toBeFunction();
  });

  it("sends a failed validation message back to the websocket host", () => {
    const send = vi.fn();
    const handler = new WebsocketRouteHandler({
      messagesItCanRecieve: {
        ping: new Message(z.object({ id: z.string() }), () => {}),
      },
      messagesItCanSend: {},
    }, {});

    const response = handler.handleRequest({
      type: "ping",
      path: "/chat",
      body: { id: 123 },
      ws: { send } as any,
    });

    expect(response.type).toBe("validation_failed");
    expect(send).toHaveBeenCalledOnce();
    expect(JSON.parse(send.mock.calls[0][0])).toMatchObject({
      type: "validation_failed",
      body: {
        fieldErrors: {
          id: expect.any(Array),
        },
      },
    });
  });
});
