import { BlazyConstructor, Message } from "@blazyts/blazy-edge";
import z from "zod";

const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"]
};

const res = BlazyConstructor
.createProd()
.block(v => {
    return v 
})
.addService("cartService", cartService)
.beforeRequestHandler("f", v => {
    return {...v, hi: "test"}
})
// .beforeRequestHandler("ggg", v => {
//     return v.hi // if you hoverr it shows its of type string
// })
.block(a => {
    return a
})
.ws({
    "path": "/chat",
    messages: {
        messagesItCanRecieve: {
            "newMessage": new Message(
                z.object({userId5: z.string()}), 
                ctx => {
                    ctx.data.userId // automatic validation
                }
            ),  
        },
        messagesItCanSend: {
            newMessage: new Message(
                z.object({ text2: z.string() }),
                ctx => ctx.data.hi45
            )
        }
    },
})
.post({
    path: "/:dynamic-para",
    handler: ctx => { // if we hover above we will see that its of type {"dynamic-param": string} so it pick it up automatically 
        ctx["dynamic-param"] 
        ctx.services.mamanger.getService()
        return ""
    },
    args: {
        ko: ""
    }
})
// .listen(3223)

const client = res.createClient().createClient()("htto://locahost:3000")

client.invoke[":dynamic-param"]["/"].GET().then(v => v.map(v => v.at(0)))
client.invoke[":dynamic-para"]["/"].GET()
client.invoke.chat["/"].ws.handle.newMessage(data => {data.data.text})