import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import type { And, If, URecord } from "@blazyts/better-standard-library";

import type { TypedRecord } from "@blazyts/better-standard-library";

type ResponseBody = ConstructorParameters<typeof Response>[0];

export interface IWHATWG<TReturn = unknown> {
  whatwg: () => TReturn;
}

export type QueryValue = string | string[];
export type QueryParams = Record<string, QueryValue>;
export type TypedRecordShape<T> = T extends URecord
  ? T
  : T extends object
  ? { [K in keyof T]: T[K] }
  : URecord;

export type NarrowTypedRecord<T extends object> = Omit<TypedRecord<URecord>, "get" | "has" | "raw" | "toJSON"> & {
  get: <K extends Extract<keyof T, string>>(v: K) => T[K];
  has: <K extends Extract<keyof T, string>>(v: K) => boolean;
  raw: () => T;
  toJSON: () => T;
};

export type RestRequestCtx<
  TBody = URecord,
  TParams extends object = URecord,
  TQuery extends QueryParams = QueryParams,
> = IWHATWG<Request> & {
  url: string;
  path: string;
  method: string;
  verb: string;
  headers: TypedRecord<Record<string, string>>;
  body: NarrowTypedRecord<TypedRecordShape<TBody>>;
  params: NarrowTypedRecord<TypedRecordShape<TParams>>;
  query: TQuery;
};

export type RestResponseCtx = {
  standard: (body?: unknown, init?: ResponseInit) => Response;
  json: (body: unknown, init?: ResponseInit) => Response;
  text: (body: string, init?: ResponseInit) => Response;
  html: (body: ResponseBody, init?: ResponseInit) => Response;
};

export type HttpVerbHandlerCtx<
  TAppCtx extends URecord = URecord,
  TBody = unknown,
  TParams extends object = URecord,
  TQuery extends QueryParams = QueryParams,
> = {
  app?: TAppCtx;
  meta?: Request;
  request: RestRequestCtx<TBody, TParams, TQuery>;
  response: RestResponseCtx;
} & TAppCtx;

export type HttpVerbHandlerMetadata = {
  subRoute: string;
  method: "POST";
};

export type HttpVerbClientMetadata = IRouteHandlerMetadata & Partial<{
  path: string;
  protocol: string;
  verb: string;
}>;

export type ClientBody<TCtx> = TCtx extends { request: RestRequestCtx<infer TBody, any, any> } ? TBody : TCtx;
export type ClientBodyArgs<TCtx> = {} extends ClientBody<TCtx>
  ? [v?: ClientBody<TCtx>]
  : [v: ClientBody<TCtx>];

export type TypedResponseBody<TReturn> = Awaited<TReturn> extends { body: infer TBody }
  ? Omit<Awaited<TReturn>, "body"> & { body: NarrowTypedRecord<TypedRecordShape<TBody>> }
  : Awaited<TReturn>;

import { panic, Try, type KeyOfOnlyStringKeys, } from "@blazyts/better-standard-library"
import type { Extends } from "@blazyts/better-standard-library/src/type-level-functions/extends";

export type ResponseObjectSchema = {
  statuses: Record<string, /* make the normal response object with status and all the other shit */ URecord>

}

class ResponseObject<TResponseObjectSchema extends ResponseObjectSchema> {
  constructor(private readonly response: Response) {

  }

  handle(v: {
    [TStatus in KeyOfOnlyStringKeys<TResponseObjectSchema["statuses"]>]: (v:  
    ) => unknown
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

type TransformResponseUnionToObject<TCtxUnion> = {
  K in TCtxUnion -> TCtxUnion[K]
}
If<
      Extends<TStatus, 204>,
      null,
      If<
        Extends<TStatus, 404>,
        null,
        If<
          Extends<TStatus, 500>,
          null,
          TResponseObjectSchema[TStatus]
        >
      >
    >
export type HttpVerbClientResponse<TReturn> = And<[
  TypedResponseBody<TReturn>,
  IWHATWG<Response>,
  ResponseObject<

  >
]>;

export type HttpVerbClientFunction<TCtx, TReturn> = ((...v: ClientBodyArgs<TCtx>) => Promise<HttpVerbClientResponse<TReturn>>) & {
  method?: string;
  path: string;
  metadata: HttpVerbClientMetadata;
};

export type NormalRouteHandlerClientRepresentation<TCtx, TReturn> = (
  meta: IRouteHandlerMetadata
) => HttpVerbClientFunction<TCtx, TReturn>;
