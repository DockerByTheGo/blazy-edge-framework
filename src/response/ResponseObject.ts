export type ResponseStatus = string | number;

export type ResponseObjectSchema = {
  statuses: Record<ResponseStatus, unknown>;
};

type StatusKeys<TSchema extends ResponseObjectSchema> = Extract<
  keyof TSchema["statuses"],
  ResponseStatus
>;

export type ResponseStatusHandlers<
  TSchema extends ResponseObjectSchema,
  TReturn = unknown,
> = {
  [TStatus in StatusKeys<TSchema>]: (
    response: TSchema["statuses"][TStatus],
  ) => TReturn;
};

export type ResponseStatusHandlerReturn<
  TSchema extends ResponseObjectSchema,
  THandlers extends Partial<ResponseStatusHandlers<TSchema>>,
> = ReturnType<NonNullable<THandlers[Extract<keyof THandlers, StatusKeys<TSchema>>]>>;

export interface IResponseObject<TSchema extends ResponseObjectSchema> {
  handle: <THandlers extends Partial<ResponseStatusHandlers<TSchema>>>(
    handlers: THandlers,
  ) => ResponseStatusHandlerReturn<TSchema, THandlers>;
}

export class ResponseObject<TSchema extends ResponseObjectSchema>
implements IResponseObject<TSchema> {
  public constructor(
    private readonly whatwgResponse: Response,
    private readonly response: unknown,
  ) {
  }

  public handle<THandlers extends Partial<ResponseStatusHandlers<TSchema>>>(
    handlers: THandlers,
  ): ResponseStatusHandlerReturn<TSchema, THandlers> {
    const handler = handlers[this.whatwgResponse.status as keyof THandlers]
      ?? handlers[String(this.whatwgResponse.status) as keyof THandlers];

    if (typeof handler !== "function") {
      throw new Error(`handler for status ${this.whatwgResponse.status} is not defined`);
    }

    return handler(this.response as never) as ResponseStatusHandlerReturn<TSchema, THandlers>;
  }
}
