import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import type { URecord } from "@blazyts/better-standard-library";

import type { TypedRecord } from "@blazyts/better-standard-library";

type ResponseBody = ConstructorParameters<typeof Response>[0];

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
> = {
  url: string;
  path: string;
  method: string;
  verb: string;
  headers: TypedRecord<Record<string, string>>;
  body: NarrowTypedRecord<TypedRecordShape<TBody>>;
  params: NarrowTypedRecord<TypedRecordShape<TParams>>;
  query: TQuery;
  whatwg: () => Request;
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

export type HttpVerbClientFunction<TCtx, TReturn> = ((...v: ClientBodyArgs<TCtx>) => Promise<TypedResponseBody<TReturn>>) & {
  method?: string;
  path: string;
  metadata: HttpVerbClientMetadata;
};

export type NormalRouteHandlerClientRepresentation<TCtx, TReturn> = (
  meta: IRouteHandlerMetadata
) => HttpVerbClientFunction<TCtx, TReturn>;
