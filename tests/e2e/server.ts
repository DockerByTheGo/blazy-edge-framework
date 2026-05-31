import z from "zod/v4";

import { BlazyConstructor } from "src/app/constructors";
import { Message } from "src/route/handlers/variations/websocket/types";

export type E2eEvent
  = | { type: "before-request"; method: string; path: string; requestId: string }
    | { type: "order-created"; orderId: string; sku: string; qty: number; requestId: string }
    | { type: "room-joined"; roomId: string; userId: string };

export function createE2eServerApp() {
  const events: E2eEvent[] = [];

  const app = BlazyConstructor
    .createProd()
    .beforeRequestHandler("attach request id and capture request", (ctx) => {
      const url = new URL(ctx.reqData.url, "http://blazy.local");
      const requestId = crypto.randomUUID();

      events.push({
        type: "before-request",
        method: String(ctx.reqData.verb ?? ctx.reqData.protocol),
        path: url.pathname,
        requestId,
      });

      return {
        ...ctx,
        requestId,
      };
    })
    .post({
      path: "/orders/:orderId/items",
      args: z.object({
        sku: z.string().min(1),
        qty: z.number().int().positive(),
      }),
      handler: (ctx) => {
        const orderId = ctx.request.params.get("orderId");
        const sku = ctx.request.body.get("sku");
        const qty = ctx.request.body.get("qty");
        const requestId = ctx.requestId as string;

        events.push({
          type: "order-created",
          orderId,
          sku,
          qty,
          requestId,
        });

        return {
          status: 202,
          body: {
            orderId,
            sku,
            qty,
            requestId,
            path: ctx.request.path,
            method: ctx.request.method,
          },
        };
      },
    })
    .get({
      path: "/health",
      handler: () => ({
        ok: true,
        checks: ["router", "http"],
      }),
    })
    .ws({
      path: "/rooms",
      messages: {
        messagesItCanRecieve: {
          "join-room": new Message(
            z.object({ roomId: z.string().min(1), userId: z.string().min(1) }),
            ({ message, ws }) => {
              const roomId = message.body.get("roomId");
              const userId = message.body.get("userId");

              events.push({
                type: "room-joined",
                roomId,
                userId,
              });

              ws.message("room-joined", {
                roomId,
                userId,
                members: 1,
              });
            },
          ),
        },
        messagesItCanSend: {
          "room-joined": new Message(
            z.object({
              roomId: z.string(),
              userId: z.string(),
              members: z.number(),
            }),
            () => {},
          ),
        },
      },
    });

  return {
    app,
    events,
  };
}
