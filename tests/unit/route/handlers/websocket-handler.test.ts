import z from "zod/v4";
import { describe, it, expect, expectTypeOf } from "bun:test";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { WebsocketRouteHandler } from "src/route/handlers/variations/websocket";
import { Message } from "src/route/handlers/variations/websocket/types";
import { BlazyConstructor } from "src/app/constructors";

describe("WebsocketRouteHandler (bun)", () => {
    const newMEssageSchema = z.object({ name: z.string(), password: z.string() })
    const joinedSchema = z.object({ name: z.string() })
    const handler = new WebsocketRouteHandler({
        messagesItCanRecieve: {
            new: new Message(
                newMEssageSchema,
                v => ({ new: "" })
            )
        },
        messagesItCanSend: {
            joined: new Message(
                joinedSchema,
                v => v.data
            )
        }
    }, {});

    const client = handler.getClientRepresentation({ serverUrl: "http://localhost:3000" });

    it("exposes getClientRepresentation and send/handle proxies", async () => {


        const expectedHndle = {
            joined: (arg) => { }
        }

        const expectedSend = {
            new: (arg) => { }
        }

        expect(client.handle.joined).toBeFunction();
        expect(client.send.new).toBeFunction();
    });

    it("exposes a correctly typed cleint", () => {
        type expectedType = {
                handle: {
                    joined: Message<typeof joinedSchema>
                },
                send: {
                    new: Message<typeof newMEssageSchema>
                }
            }
        expectTypeOf(client).toMatchObjectType<expectedType>()
    })
    it("registers a ws handler when using Blazy.ws", () => {
        const pingSchema = z.object({ text: z.string() });
        const app = BlazyConstructor
        .createEmpty()
        .ws({
            path: "/chat",
            messages: {
                messagesItCanRecieve: {
                    ping: new Message(pingSchema, () => ({ pinged: true }))
                },
                messagesItCanSend: {
                    pong: new Message(pingSchema, ({ data }) => data)
                }
            }
        });

        const handler = treeRouteFinder(app.routes, new Path("/chat"))
            .expect("Expected ws handler to be registered under /chat")
            .valueOf() as any;

        expect(handler.ws).toBeDefined();
        expect(handler.ws.handleRequest).toBeFunction();
        expect(handler.ws.getClientRepresentation).toBeFunction();
    });
});
