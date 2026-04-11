import type { IRouteHandler } from "@blazyts/backend-lib";
import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import {
    type WebSocketMessage,
    type WebSocketResponse,
    type WebSocketConnection,
    type WebSocketContext,
    type Schema,
    type WeboscketRouteCleintRepresentation,
    Message
} from "./types";
import { getWebsocketConnection } from "./WebsocketConnectionSingleton";


export class WebsocketRouteHandler<
    TMessagesSchema extends Schema,
> implements IRouteHandler<WebSocketMessage, WebSocketResponse> {


    constructor(
        public readonly schema: TMessagesSchema,
        public metadata: IRouteHandlerMetadata
    ) {
    }

    handleRequest(message: WebSocketMessage): WebSocketResponse {

        const messageHandler = this.schema.messagesItCanRecieve[message.type];
        if (messageHandler) {
            try {
                const parsed = messageHandler.schema.parse(message.body);
                messageHandler.handler({ data: parsed, ws: undefined as any });
            } catch (error) {
                }
            }


        // Default response if no handler provided
        return {
            type: "ack",
            data: { received: message.type }
        };
    }


    getClientRepresentation = (metadata: IRouteHandlerMetadata): WeboscketRouteCleintRepresentation<TMessagesSchema> => {

        const wsUrl = metadata.serverUrl.replace(/^http/, "ws");

        let ws = getWebsocketConnection(wsUrl);

        const send = {}
        Object
            .entries(this.schema.messagesItCanRecieve)
            .forEach(([messageName, message], i) => {
                send[messageName] = async (data) => {
                    let res = message.schema.parse(data)
                    const dataToSend: WebSocketMessage & {} = { body: res, path: this.metadata.subRoute, type: messageName }
                    const ddd = JSON.stringify(dataToSend)
                    
                    // Wait for WebSocket to be open
                    if (ws.readyState === WebSocket.CONNECTING) {
                        await new Promise((resolve) => {
                            ws.addEventListener('open', resolve, { once: true });
                        });
                    }
                    
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(ddd)
                        console.log("g")
                    } else {
                        console.error("WebSocket is not open, state:", ws.readyState);
                    }
                }
            })

        const handle = {}
        Object
            .entries(this.schema.messagesItCanSend)
            .forEach(
                ([messageName, message], i) => {
                    handle[messageName] = (callback: (data) => void) => {
                        const res = message.schema.parse()
                        getWebsocketConnection

                    }
                }
            )


        return {
            handle,
            send
        };
    }

}
