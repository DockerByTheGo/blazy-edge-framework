import { app } from "./app"

export const client = app.createClient().createClient()("http://localhost:3005")

client.invoke.ws("room-1")["/"].ws.handle["new-message"](v => {
    console.log("recieved message 1234", v.message.body.get("content"))
})


client.invoke.ws("room-1")["/"].ws.send["new-message"]({content: ""})
client.invoke.rpc.getCart["/"].POST()

setTimeout(() => process.exit(0),3000)

const res = await client.invoke.rpc.getCart["/"].POST({ id: "cart-1" })
res.map(v => console.log("rpc", v))
console.log("----")

console.log("http")
const res2 = await client.invoke("hello")("d").lolo("mki")["/"].GET()
console.log("http response", res2.raw.response.status, res2.raw.response.body)
console.log(res2
    // .raw.k.statuses
    .raw.handle({
        "201": v => 
            console.log("server returned 201 with", v.body.toJSON()),
        "204": v => console.log("server returned 204"),
        "404": v => console.log("server returned 404"),
    })
)
