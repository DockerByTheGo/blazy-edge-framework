import type { KeyOfOnlyStringKeys, URecord } from "@blazyts/better-standard-library";
import type z from "zod/v4";

import type { NarrowTypedRecord } from "src/route/handlers/variations/http/HttpVerbRouteHandler";

export type WebSocketMessage = {
  type: string;
  body: URecord;
  path: string;
  connectionId?: string;
  params?: URecord;
  ws?: WebSocket;
};

export type WebSocketResponse = {
  type: string;
  data: URecord;
  targetConnectionIds?: string[];
};

export type WebSocketConnection = {
  id: string;
  send: (message: WebSocketResponse) => void;
  close: () => void;
  isAlive: boolean;
};

export type WebSocketContext = {
  connections: Map<string, WebSocketConnection>;
  broadcast: (message: WebSocketResponse) => void;
  sendTo: (connectionId: string, message: WebSocketResponse) => void;
};

type MessageContract = Record<string, Message<any, z.ZodObject, any>>;

export type WebSocketMessenger<TMessages extends MessageContract = MessageContract> = WebSocket & {
  message: <TType extends KeyOfOnlyStringKeys<TMessages>>(
    type: TType,
    body: z.infer<TMessages[TType]["schema"]>,
  ) => void;
};

export type WebSocketHandlerCtx<
  TBody,
  TParams extends object,
  TMessagesItCanSend extends MessageContract = MessageContract,
> = {
  message: {
    body: NarrowTypedRecord<TBody & object>;
    params: NarrowTypedRecord<TParams>;
  };
  ws: WebSocketMessenger<TMessagesItCanSend>;
};

export class Message<
  TParams extends object,
  TSchema extends z.ZodObject,
  TMessagesItCanSend extends MessageContract = MessageContract,
> {
  constructor(
    public readonly schema: TSchema,
    public readonly handler: (ctx: WebSocketHandlerCtx<z.infer<TSchema>, TParams, TMessagesItCanSend>) => void,
  ) { }
}

export type Schema<TCtx extends { params: object } = { params: any }> = {
  messagesItCanSend: Record<string, Message<TCtx["params"], z.ZodObject>>;
  messagesItCanRecieve: Record<string, Message<TCtx["params"], z.ZodObject>>;
};

export type WeboscketRouteCleintRepresentation<TServerMessagesSchema extends Schema> = {
  handle: {
    [Message in KeyOfOnlyStringKeys<TServerMessagesSchema["messagesItCanSend"]>]: (callback: TServerMessagesSchema["messagesItCanSend"][Message]["handler"]) => void
  };
  send: {
    [Message in KeyOfOnlyStringKeys<TServerMessagesSchema["messagesItCanRecieve"]>]: (
      body: z.infer<TServerMessagesSchema["messagesItCanRecieve"][Message]["schema"]>,
    ) => void
  };
};
