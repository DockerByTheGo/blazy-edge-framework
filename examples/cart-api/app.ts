import { Message } from "src";
import { BlazyConstructor } from "src/app/constructors";
import z from "zod/v4";

const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"]
}

export const app = BlazyConstructor
    .createProd()
    .addService("cartService", cartService)
    .get(
        {
            path: "/:hi/:koko/lolo/:po",
            handler: v => {
                console.log(v.request)
                if (Math.random()) {

                    return {
                        hi: v.request.params.get("hi"),
                        ko: v.request.params.get("koko"),
                        po: v.request.params.get("po")
                    }
                } else if (Math) {
                    return null
                } else if (Math) {
                    return undefined
                }

            },
        }
    )
    .ws({
        "path": "/ws/:id",
        messages: {
            messagesItCanSend: {
                "new-message": new Message(
                    z.object({ content: z.string() }),
                    ctx => {
                        console.log("Sending message to room", ctx, "with content:", ctx.message.body.get("content"));
                    }
                )
            },
            messagesItCanRecieve: {
                "new-message": new Message(
                    z.object({ content: z.string() }),
                    async ctx => {
                        await ctx.ws.message("new-message", { content: "jkhfwbhksbjhd" })
                    }
                )
            },
        }
    })
    .rpc({
        name: "getCart",
        handler: ctx => {
            console.log(ctx.request.body.get("id"))

            return { items: cartService.getAll() };
        },
        args: z.object({
            id: z.string(),
        })
    })