import { BlazyConstructor } from "src/app/constructors";
import z from "zod/v4";



const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"]
};
const server= BlazyConstructor
    .createProd()
    .addService("cartService", cartService)
    .get(
        {
            path: "/:hi",
            handler: v => ({ji: v.hi}),
        }
    )

    server.listen(3005)
// const client =     server.createClient().createClient()("")


