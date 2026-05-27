import type { IRouteHandler } from "@blazyts/backend-lib";
import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";

import type { Schema, WeboscketRouteCleintRepresentation, WebSocketMessage, WebSocketResponse } from "./types";

import { formatFailedValidation } from "src/response";

import { getWebsocketConnection } from "./WebsocketConnectionSingleton";

type WebsocketRouteMetadata = Partial<IRouteHandlerMetadata> & {
  subRoute: string;
  protocol?: "ws";
};

export class WebsocketRouteHandler<
  TMessagesSchema extends Schema,
> implements IRouteHandler<WebSocketMessage, WebSocketResponse> {
  constructor(
    public readonly schema: TMessagesSchema,
    public metadata: WebsocketRouteMetadata,
  ) {
  }

  handleRequest(message: WebSocketMessage): WebSocketResponse {
    const messageHandler = this.schema.messagesItCanRecieve[message.type];
    if (messageHandler) {
      const parsed = messageHandler.schema.safeParse(message.body);
      if (parsed.success) {
        messageHandler.handler({
          message: {
            body: parsed.data,
            params: (message.params ?? {}) as any,
          },
          ws: message.ws as WebSocket,
        });
      }
      else {
        const response = formatFailedValidation(parsed.error);
        message.ws?.send(JSON.stringify(response));
        return {
          type: response.type,
          data: response.body,
        };
      }
    }

    // Default response if no handler provided
    return {
      type: "ack",
      data: { received: message.type },
    };
  }

  getClientRepresentation = (metadata: IRouteHandlerMetadata): WeboscketRouteCleintRepresentation<TMessagesSchema> => {
    const wsUrl = metadata.serverUrl.replace(/^http/, "ws");

    const ws = getWebsocketConnection(wsUrl);

    const send = {};
    Object
      .entries(this.schema.messagesItCanRecieve)
      .forEach(([messageName, message], i) => {
        send[messageName] = async (data) => {
          const res = message.schema.parse(data);
          const dataToSend: WebSocketMessage & {} = { body: res, path: this.metadata.subRoute, type: messageName };
          const ddd = JSON.stringify(dataToSend);

          // Wait for WebSocket to be open
          if (ws.readyState === WebSocket.CONNECTING) {
            await new Promise((resolve) => {
              ws.addEventListener("open", resolve, { once: true });
            });
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(ddd);
            console.log("g");
          }
          else {
            console.error("WebSocket is not open, state:", ws.readyState);
          }
        };
      });

    const handle = {};
    Object
      .entries(this.schema.messagesItCanSend)
      .forEach(
        ([messageName, message], i) => {
          handle[messageName] = (callback: (data) => void) => {
            getWebsocketConnection;
          };
        },
      );

    return {
      handle,
      send,
    };
  };
}
