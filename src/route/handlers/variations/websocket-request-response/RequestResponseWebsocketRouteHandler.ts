import type { URecord } from "@blazyts/better-standard-library";
import type z from "zod/v4";

import type { TypedRecord } from "../http/HttpVerbRouteHandler";
import type { Message } from "../websocket/types";

import { WebsocketRouteHandler } from "../websocket/WebsocketRouteHandler";

type RequestResponseWebsocketMessage = {
  requestId: string;
  body: URecord;
  type: "request";
  path: string;
};

export class RequestResponseWebsocket<TSchema extends {
  ReQuestSchema: z.ZodObject;
  ResponseSchema: z.ZodObject;
}> {
  public readonly websocketRouteHandler: WebsocketRouteHandler<{
    messagesItCanRecieve: {
      request: Message<TSchema["ReQuestSchema"]>;
    };
    messagesItCanSend: {
      response: Message<TSchema["ResponseSchema"]>;
    };
  }>;

  constructor(
    public readonly schema: TSchema,
    handler: (ctx: { message: { body: TypedRecord<z.infer<TSchema["ReQuestSchema"]> & URecord>; params: TypedRecord<URecord> }; ws: WebSocket }) => z.infer<TSchema["ResponseSchema"]>,
    metadata,
  ) {
    this.websocketRouteHandler = new WebsocketRouteHandler(
      {
        messagesItCanRecieve: {
          request: {
            schema: this.schema.ReQuestSchema,
            handler: ctx => ctx.ws.send(JSON.stringify({
              body: handler(ctx),
              type: "response",
              requestId: ctx.message.body.get("requestId"),
            })),
          },
        },
        messagesItCanSend: {
          response: {
            schema: this.schema.ResponseSchema,
            handler: () => { },
          },
        },
      },
      metadata,
    );
  }

  handleRequest(message: RequestResponseWebsocketMessage) {
    this.websocketRouteHandler.handleRequest(message);
  }
}
