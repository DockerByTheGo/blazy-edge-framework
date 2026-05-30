import type { IRouteHandler } from "@blazyts/backend-lib";
import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";

import { TypedRecord } from "src/route/handlers/variations/http/HttpVerbRouteHandler";

import type { Schema, WeboscketRouteCleintRepresentation, WebSocketMessage, WebSocketMessenger, WebSocketResponse } from "./types";
import { getWebsocketConnection } from "./WebsocketConnectionSingleton";
import { formatFailedValidation } from "../http/responses";

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

  private createWebSocketMessenger(
    ws: WebSocket | undefined,
    path = this.metadata.subRoute,
    params?: WebSocketMessage["params"],
  ): WebSocketMessenger<TMessagesSchema["messagesItCanSend"]> {
    const socket = (ws ?? { send: () => {} }) as WebSocketMessenger<TMessagesSchema["messagesItCanSend"]>;

    socket.message = (type, body) => {
      const messageSchema = this.schema.messagesItCanSend[type];
      const parsed = messageSchema.schema.parse(body);

      socket.send(JSON.stringify({
        body: parsed,
        params,
        path,
        type,
      }));
    };

    return socket;
  }

  handleRequest(message: WebSocketMessage): WebSocketResponse {
    const messageHandler = this.schema.messagesItCanRecieve[message.type];
    if (messageHandler) {
      const parsed = messageHandler.schema.safeParse(message.body);
      if (parsed.success) {
        messageHandler.handler({
          message: {
            body: new TypedRecord(parsed.data),
            params: new TypedRecord((message.params ?? {}) as any),
          },
          ws: this.createWebSocketMessenger(message.ws, message.path, message.params),
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
    const routePath = metadata.path ?? this.metadata.subRoute;
    const getWs = () => getWebsocketConnection(wsUrl);

    const send = {};
    Object
      .entries(this.schema.messagesItCanRecieve)
      .forEach(([messageName, message], i) => {
        send[messageName] = async (data) => {
          const ws = getWs();
          const res = message.schema.parse(data);
          const dataToSend: WebSocketMessage & {} = { body: res, path: routePath, type: messageName };
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
            const ws = getWs();

            ws.addEventListener("message", (event) => {
              const rawMessage = typeof event.data === "string"
                ? JSON.parse(event.data) as WebSocketMessage
                : event.data as WebSocketMessage;

              if (rawMessage.type !== messageName) {
                return;
              }

              const parsed = message.schema.parse(rawMessage.body);

              callback({
                message: {
                  body: new TypedRecord(parsed),
                  params: new TypedRecord((rawMessage.params ?? {}) as any),
                },
                ws,
              });
            });
          };
        },
      );

    return {
      handle,
      send,
    };
  };
}
