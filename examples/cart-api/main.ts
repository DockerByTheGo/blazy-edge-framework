import { Message } from "src";
import { BlazyConstructor } from "src/app/constructors";
import z from "zod/v4";

const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"]
};
const server = BlazyConstructor
    .createProd()
    .addService("cartService", cartService)
    .get(
        {
            path: "/:hi",
            handler: v => {
                console.log(v.request)
                return{ ji: v.request.params }},
        }
    )
    .ws({
        "path": "/ws/:id",
        messages: {
            messagesItCanSend: {
                "new-message": new Message(
                    z.object({ content: z.string() }),
                    ctx => {
                        ctx.ws.message("", {})
                        console.log("Sending message to room", ctx, "with content:", ctx.message.body.content);
                    }
                )
            },
            messagesItCanRecieve: {
                "new-message": new Message(
                    z.object({ content: z.string() }),
                    ctx => {
                        console.log("Received message for room", ctx, "with content:", ctx.message.body.content);
                    }
                )
            },
        }
    })
    .rpc({
        name: "getCart",
        handler: ctx => {
            console.log(ctx.request.body.raw())

            return { body: cartService.getAll() };
        },
        args: z.object({
            id: z.string(),
        })
    })

server.listen(3005)
const client =     server.createClient().createClient()("")

client.invoke.ws[":id"]["/"].ws.handle["new-message"](v => {
    
})

client.invoke.rpc.getCart["/"].POST().then(v => v.map(v => {
    v.body
}))