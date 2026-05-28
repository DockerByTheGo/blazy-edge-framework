import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import type { URecord } from "@blazyts/better-standard-library";

import type { TypedRecord } from "@blazyts/better-standard-library";

type ResponseBody = ConstructorParameters<typeof Response>[0];

export type QueryValue = string | string[];
export type QueryParams = Record<string, QueryValue>;
export type TypedRecordShape<T> = T extends URecord ? T : URecord;

export type RestRequestCtx<
  TBody = URecord,
  TParams extends URecord = URecord,
  TQuery extends QueryParams = QueryParams,
> = {
  url: string;
  path: string;
  method: string;
  verb: string;
  headers: TypedRecord<Record<string, string>>;
  body: TypedRecord<TypedRecordShape<TBody>>;
  params: TypedRecord<TParams>;
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
  TParams extends URecord = URecord,
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

export type ClientBody<TCtx> = TCtx extends HttpVerbHandlerCtx<any, infer TBody, any, any> ? TBody : TCtx;
export type ClientBodyArgs<TCtx> = {} extends ClientBody<TCtx>
  ? [v?: ClientBody<TCtx>]
  : [v: ClientBody<TCtx>];

export type TypedResponseBody<TReturn> = Awaited<TReturn> extends { body: infer TBody }
  ? Omit<Awaited<TReturn>, "body"> & { body: TypedRecord<TypedRecordShape<TBody>> }
  : Awaited<TReturn>;

export type NormalRouteHandlerClientRepresentation<TCtx, TReturn> = (
  meta: IRouteHandlerMetadata
) => (...v: ClientBodyArgs<TCtx>) => Promise<TypedResponseBody<TReturn>>;
