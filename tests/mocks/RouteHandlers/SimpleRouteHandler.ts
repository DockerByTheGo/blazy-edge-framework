

export class SimpleRouteHandler {
    getClientRepresentation = () => ({ foo: "bar" });
    handleRequest() {return {body: {}} }
}