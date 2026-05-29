import { app } from "./app"

export const client = app.createClient().createClient()("http://localhost:3005")

client.invoke.ws[":id"]["/"].ws.handle["new-message"](v => {
    console.log("recieved message 1234")
})

client.invoke.ws[":id"]["/"].ws.send["new-message"]({content: ""})

setTimeout(() => process.exit(0),3000)

console.log("rpc")
const res = await client.invoke.rpc.getCart["/"].POST({ id: "cart-1" })
res.map(console.log)
console.log("----")

console.log("http")
const res2 = await client.invoke[":hi"]["/"].GET()
console.log(res2.raw)
