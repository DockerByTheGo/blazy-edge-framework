import { BlazyConstructor } from "src/app/constructors";



const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"]
};

const client = BlazyConstructor
    .createProd()
    .addService("cartService", cartService)
    .get(
        {
            path: "/hi",
            handler: v => "hi",
            args: {}
        }
    )
    .createClient().createClient()("")



    client.invoke.hi["/"].GET()