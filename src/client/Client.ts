import type { IRouteHandler, RouteTree } from "@blazyts/backend-lib";
import type { IMapable, KeyOfOnlyStringKeys } from "@blazyts/better-standard-library";

import { Hooks } from "@blazyts/backend-lib";
import { Mapable } from "@blazyts/better-standard-library";

import type { ClientHooks } from "./types/ClientHooks";

type ClientRepresentation<THandler> = THandler extends {
  getClientRepresentation: (...args: any[]) => infer TRepresentation;
}
  ? MappedClientRepresentation<TRepresentation>
  : never;

type MappedClientRepresentation<TRepresentation>
  = TRepresentation extends (...args: infer TArgs) => infer TReturn
    ? (...args: TArgs) => Promise<IMapable<Awaited<TReturn>>>
    : TRepresentation extends object
      ? { [K in keyof TRepresentation]: MappedClientRepresentation<TRepresentation[K]> }
    : TRepresentation;

type RuntimeRouteHandler = IRouteHandler<any, any> & {
  metadata: {
    subRoute: string;
    [key: string]: unknown;
  };
};

export type Routes<R> = {
  send: <Route extends KeyOfOnlyStringKeys<R>>(route: Route) => R[Route] extends IRouteHandler<any, any>
    ? R[Route]["getClientRepresentation"]
    : Routes<R[Route]>;
};

export type ClientObject<T> = {
  [CurrentRoute in KeyOfOnlyStringKeys<T>]:
  // If this is the "/" key, it contains protocol handlers
  CurrentRoute extends "/"
    ? {
        [Protocol in KeyOfOnlyStringKeys<T[CurrentRoute]>]:
        ClientRepresentation<T[CurrentRoute][Protocol]>
      }
  // Otherwise, recurse into nested routes
    : T[CurrentRoute] extends { getClientRepresentation: (...args: any[]) => unknown }
      ? ClientRepresentation<T[CurrentRoute]>
      : ClientObject<T[CurrentRoute]>
};

function emptyClientHooks(): ClientHooks {
  return {
    beforeSend: Hooks.empty(),
    afterReceive: Hooks.empty(),
    onErrored: Hooks.empty(),
  };
}

export class ClientConstructors {
  empty() {
    return new Client({}, "");
  }

  fromRoutes<TRouteTree extends RouteTree>(routes: TRouteTree) {
    return new Client(routes, "");
  }
}

export class Client<TRouteTree extends RouteTree> {
  public readonly invoke: ClientObject<TRouteTree>;

  public constructor(
    private readonly routeTree: TRouteTree,
    public readonly url: string,
    private readonly hooks: ClientHooks = emptyClientHooks(),
  ) {
    const build = (tree: any, path: string = "") => {
      const out: any = {};
      for (const key of Object.keys(tree ?? {})) {
        const node = tree[key];

        // Check if this is the "/" key with protocol handlers
        if (key === "/") {
          // This is a route endpoint with protocol handlers
          const protocolHandlers: any = {};
          for (const protocol of Object.keys(node)) {
            const handler = node[protocol] as RuntimeRouteHandler;
            if (handler && typeof handler.getClientRepresentation === "function") {
              const representation = handler.getClientRepresentation({
                serverUrl: this.url + handler.metadata.subRoute,
                path,
                ...handler.metadata,
              } as any);
              protocolHandlers[protocol] = this.wrapClientRepresentation(representation);
            }
          }
          out[key] = protocolHandlers;
        }
        else {
          // This is a path segment, recurse
          const currentPath = path ? `${path}/${key}` : `/${key}`;
          out[key] = build(node ?? {}, currentPath);
        }
      }
      return out;
    };

    this.invoke = build(this.routeTree) as unknown as ClientObject<TRouteTree>;
  }

  private wrapClientRepresentation<TRepresentation>(representation: TRepresentation): MappedClientRepresentation<TRepresentation> {
    if (typeof representation !== "function") {
      if (representation !== null && typeof representation === "object") {
        return Object.fromEntries(
          Object.entries(representation).map(([key, value]) => [
            key,
            this.wrapClientRepresentation(value),
          ]),
        ) as MappedClientRepresentation<TRepresentation>;
      }

      return representation as MappedClientRepresentation<TRepresentation>;
    }

    const clientFn = representation as (...args: unknown[]) => unknown;
    const wrapped = async (...args: unknown[]) => {
      try {
        const nextArgs = args.length === 1
          ? [this.hooks.beforeSend.execute(args[0] as any)]
          : args;
        const response = await clientFn(...nextArgs);
        const afterReceiveResponse = this.hooks.afterReceive.execute({ response } as any) as unknown;
        const value = afterReceiveResponse !== null
          && typeof afterReceiveResponse === "object"
          && Object.hasOwn(afterReceiveResponse, "response")
          ? (afterReceiveResponse as { response: unknown }).response
          : afterReceiveResponse;

        return Mapable.new(value);
      }
      catch (error) {
        this.hooks.onErrored.execute({ error });
        throw error;
      }
    };

    Object.assign(wrapped, representation);

    return wrapped as MappedClientRepresentation<TRepresentation>;
  }

  batch(v: Routes<RouteTree>) {

  } // send multiple requests as one to avoid multiple hadnshakes, you recieve all th responses from it in one connection

  /*

    Sends the schema it has recieved against the server to see if they are matching, just a type quard, to inform the cleint, also note that this should be removed in prod to not ,ake enumeration attacks easier

    probably needs to be inside blazy edge
    */
  confirmSchema() {

  }
}
