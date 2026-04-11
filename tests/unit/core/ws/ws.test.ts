import { describe, it, expect, vi } from "vitest";
import { BlazyConstructor } from "src/app/constructors";
import { treeRouteFinder } from "src/route/finders/tree";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { Message } from "src/route/handlers/variations/websocket/types";
import z from "zod/v4";

describe("ws()", () => {
  it("registers a handler at the given path under ws protocol", () => {
    const app = BlazyConstructor.createEmpty().ws({
      path: "/chat",
      messages: {
        messagesItCanRecieve: {},
        messagesItCanSend: {},
      },
    });

    const protocols = treeRouteFinder(app.routes, new Path("/chat")).unpack() as any;
    expect(protocols.ws).toBeDefined();
  });

  it("does not register under POST or GET", () => {
    const app = BlazyConstructor.createEmpty().ws({
      path: "/stream",
      messages: { messagesItCanRecieve: {}, messagesItCanSend: {} },
    });

    const protocols = treeRouteFinder(app.routes, new Path("/stream")).unpack() as any;
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

    const protocols = treeRouteFinder(app.routes, new Path("/events")).unpack() as any;
    expect(protocols.ws.schema.messagesItCanRecieve.ping).toBeDefined();
  });

  it("ws and post on the same path coexist", () => {
    const app = BlazyConstructor.createEmpty()
      .post({ path: "/dual", handeler: () => ({ body: {} }) })
      .ws({ path: "/dual", messages: { messagesItCanRecieve: {}, messagesItCanSend: {} } });

    const protocols = treeRouteFinder(app.routes, new Path("/dual")).unpack() as any;
    expect(protocols.POST).toBeDefined();
    expect(protocols.ws).toBeDefined();
  });
});
