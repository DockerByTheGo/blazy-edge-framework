import { describe, it, expect, vi } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { Message } from "src/route/handlers/variations/websocket/types";
import z from "zod/v4";
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
