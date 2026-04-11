import type { KeyOfOnlyStringKeys, URecord } from "@blazyts/better-standard-library";
import type z from "zod/v4";

export type WebSocketMessage = {
    type: string;
    body: URecord;
    path: string;
    connectionId?: string;
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

export class Message<TSchema extends z.ZodObject> {

    constructor(
        public readonly schema: TSchema,
        public readonly handler: (ctx: { data: z.infer<TSchema>, ws: WebSocket }) => void
    ) { }
}

export type Schema = {
    messagesItCanSend: Record<string, Message<z.ZodObject>>,
    messagesItCanRecieve: Record<string, Message<z.ZodObject>>
}



export type WeboscketRouteCleintRepresentation<TServerMessagesSchema extends Schema> = {
    handle: {
        [Message in KeyOfOnlyStringKeys<TServerMessagesSchema["messagesItCanSend"]>]: (callback: TServerMessagesSchema["messagesItCanSend"][Message]["handler"]) => void
    },
    send: {
        [Message in KeyOfOnlyStringKeys<TServerMessagesSchema["messagesItCanRecieve"]>]: (
            data: (Parameters<TServerMessagesSchema["messagesItCanRecieve"][Message]["handler"]>[0])["data"]) => void
    }
}
