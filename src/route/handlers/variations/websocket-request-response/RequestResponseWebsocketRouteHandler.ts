import type { URecord } from "@blazyts/better-standard-library";
import { WebsocketRouteHandler } from "../websocket/WebsocketRouteHandler";
import type z from "zod/v4";
import type { Message } from "../websocket/types";

type RequestResponseWebsocketMessage = {
    requestId: string;
    body: URecord;
    type: "request",
    path: string
}

export class RequestResponseWebsocket<TSchema extends {
    ReQuestSchema: z.ZodObject,
    ResponseSchema: z.ZodObject,
}> {
    public readonly websocketRouteHandler: WebsocketRouteHandler<{
        messagesItCanRecieve: {
            request: Message<TSchema["ReQuestSchema"]> 
        },
        messagesItCanSend: {
            response: Message<TSchema["ResponseSchema"]>
        }
    }>
    constructor(
        public readonly schema: TSchema,
        handler: (ctx: { data: z.infer<TSchema["ReQuestSchema"]>, ws: WebSocket }) => z.infer<TSchema["ResponseSchema"]>,
        metadata) {
        this.websocketRouteHandler = new WebsocketRouteHandler(
            {
                messagesItCanRecieve: {
                    request: {
                        schema: this.schema.ReQuestSchema,
                        handler: ctx => ctx.ws.send(JSON.stringify({
                            body: handler(ctx),
                            type: "response",
                            requestId: ctx.data.requestId
                    }))
                    }
                },
                messagesItCanSend: {
                    response: {
                        schema: this.schema.ResponseSchema,
                        handler: () => { }
                    }
                }
            }, 
        metadata
        )
    }

    handleRequest(message: RequestResponseWebsocketMessage) {
        this.websocketRouteHandler.handleRequest(message)
    }
}