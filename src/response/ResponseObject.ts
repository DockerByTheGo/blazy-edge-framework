import { panic, Try, type KeyOfOnlyStringKeys, type URecord } from "@blazyts/better-standard-library"

export type ResponseObjectSchema = {
    statuses: Record<string, /* make the normal response object with status and all the other shit */ URecord>

}

class ResponseObject<TResponseObjectSchema extends ResponseObjectSchema> {
    constructor(private readonly response: Response) {

    }

    handle(v: {
        [TStatus in KeyOfOnlyStringKeys<TResponseObjectSchema["statuses"]>]: (v: TResponseObjectSchema[TStatus]) => unknown
    }) {
        return Try(
            v[this.response.status], 
            {
                ifNone: panic("handler for status" + this.response.status + "is not defined"),
                ifNotNone: handler => handler(this.response)
            }
        )


    }
}




new ResponseObject<{statuses: {"3": {"kook": ""}}}>({}).handle({
    "3": v => 
})