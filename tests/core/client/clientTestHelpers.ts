import type { IRouteHandler, IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";

import { vi } from "vitest";

export type RuntimeMeta = IRouteHandlerMetadata & Record<string, unknown>;

export function makeMockHandler<TArg, TReturn>(
  subRoute: string,
  response: TReturn,
) {
  type ClientFn = (arg: TArg) => Promise<TReturn>;

  const clientFn = vi.fn(async (_arg: TArg): Promise<TReturn> => response);

  const handler = {
    metadata: { subRoute, verb: "POST" as const },
    handleRequest: (_arg: TArg): TReturn => response,
    getClientRepresentation: (_meta: RuntimeMeta): ClientFn => {
      Object.assign(clientFn, {
        method: "post",
        path: _meta.path ?? subRoute,
        metadata: _meta,
      });
      return clientFn;
    },
  } satisfies IRouteHandler<any, any>;

  return handler;
}

export function makeNonFunctionRepresentationHandler<TRepresentation>(
  subRoute: string,
  representation: TRepresentation,
) {
  return {
    metadata: { subRoute, verb: "GET" as const },
    handleRequest: () => representation,
    getClientRepresentation: (_meta: RuntimeMeta): TRepresentation => representation,
  } satisfies IRouteHandler<any, any>;
}

export function protocolLeaf<
  TProtocol extends string,
  THandler extends IRouteHandler<any, any>,
>(protocol: TProtocol, handler: THandler) {
  return { "/": { [protocol]: handler } } as {
    "/": { [K in TProtocol]: THandler };
  };
}
