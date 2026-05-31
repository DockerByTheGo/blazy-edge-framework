import { Message } from "src";
import { BlazyConstructor } from "src/app/constructors";
import z from "zod/v4";

const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"],
    get: (number: string) => number
}

let cpun = 0
const counterService = {
    config: {},
    count: () => {
        return cpun++
    }
}

export const app = BlazyConstructor
    .createProd()
    .addService("cartService", cartService)
    .addService("counter", counterService)
    .get({
        path: "/hii",
        handler: v => v
    })
    .get(
        {
            path: "/:hi/:koko/lolo/:po",
            handler: v => {
                const count = v.services.getService("counter").count()
                v.request.params.getUnsafe("string")
                if (count % 3 === 0) {

                    return {
                        hi: v.request.params.get("hi"),
                        ko: v.request.params.get("koko"),
                        po: v.request.params.get("po")
                    }
                } else if (count % 3 === 1) {
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
            if()
            return { items: ctx.services.getService("cartService").getAll() };
        },
        args: z.object({
            id: z.string(),
            one: z.boolean().optional()
        })
    })