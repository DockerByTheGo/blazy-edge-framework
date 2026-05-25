import { BlazyConstructor } from "src/app/constructors";



const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"]
};
const server= BlazyConstructor
    .createProd()
    .addService("cartService", cartService)
    .get(
        {
            path: "/hi",
            handler: v => "hi",
            args: {}
        }
    )

    server.listen(3005)
const client =     server.createClient().createClient()("")



    client.invoke.hi["/"]