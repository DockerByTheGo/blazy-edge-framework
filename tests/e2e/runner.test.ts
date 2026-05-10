import { describe, it } from "bun:test";
import z from "zod/v4";

import { app } from "./server";

describe("e2e simple app", () => {
  it("responds to POST /jiji/koko and WebSocket /rooms", async () => {
    const port = 3001;
    const server: any = app.listen(port);

    try {
      const client = app
        .beforeRequestHandler("provide user", ctx => ({ ...ctx, user: ctx.services.auth.getUserId(ctx.token) }))
        .beforeRequestHandler("log", (ctx) => {
          const recievedAt = Date.now();
          ctx.services.logger.saveLog({
            ...ctx.reqData,
            timestamp: recievedAt,
          });
          console.log("gg", ctx);
          return ctx;
        })
        .ws({
          path: "/rooms",
          messages: {
            messagesItCanRecieve: {
              "join-room": {
                schema: z.object({ roomId: z.string() }),
                handler: ({ data, ws }) => {
                  console.log("User wants to join room", data.roomId);
                },
              },
            },
            messagesItCanSend: {
              "room-joined": {
                schema: z.object({ roomId: z.string() }),
                handler: (v) => {

                },
              },
            },
          },
        })
        .createClient()
        .createClient()(`http://localhost:${port}`);

      const httpReq = (await client.invoke.jiji.koko["/"].POST({ koko: "" }));
      client.invoke.rooms["/"].ws.handle["room-joined"]((v) => {

      });

      client.invoke.rooms["/"].ws.send["join-room"]({ roomId: "123" });

      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Test completed");
    }
    finally {
      try { server.stop?.(); }
      catch { }
    }
  });
});
