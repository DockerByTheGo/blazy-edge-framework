export interface IWHATWG<TReturn = unknown> {
  whatwg: () => TReturn;
}
export type HandlerProtocol = "POST" | "GET" | "PUT" | "DELETE" | "PATCH" | "ws" | "http" | "static";