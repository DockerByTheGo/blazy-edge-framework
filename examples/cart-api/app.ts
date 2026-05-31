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
    .get({
        path: "/hii",
        handler: v => v
    })
    .get(
        {
            path: "/:hi/:koko/lolo/:po",
            handler: v => {
                const random = Math.random()
                console.log("random",random)
                if (random > 0.5) {

                    return {
                        hi: v.request.params.get("hi"),
                        ko: v.request.params.get("koko"),
                        po: v.request.params.get("po")
                    }
                } else if (random > 0.25) {
                    return null
                } else {
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
    .post({
        path: "/koko",
        handler: v => JSON.stringify(v)
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