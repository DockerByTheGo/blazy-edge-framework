import type { ifAny } from "@blazyts/better-standard-library";

import type { ClientHooks } from "../types/ClientHooks";
import type { Config } from "../types/Config";

import { Client, type ClientObject } from "../Client";
import { Hooks, type Hook, type RouteTree } from "@blazyts/backend-lib";

export const CleintBuilderConstructors = {

  empty() {
    return new ClientBuilder(
      {
        afterReceive: Hooks.empty(),
        beforeSend: Hooks.empty(),
        onErrored: Hooks.empty(),
      },
      {
        retries: 3,
      },
      {},
    );
  },

  fromRouteTree<T extends RouteTree>(router: T) {
    return new ClientBuilder(
      {
        afterReceive: Hooks.empty(),
        beforeSend: Hooks.empty(),
        onErrored: Hooks.empty(),
      },
      {
        retries: 3,
      },
      router,
    );
  },

};

export class ClientBuilder<
  TRouter extends RouteTree,
  THooks extends ClientHooks,
> {
  constructor(
    public hooks: THooks,
    private config: Config,
    protected router: TRouter,
  ) { }

  hook<
    THookType extends keyof ClientHooks,
    THookName extends string,
    TReturn,
  >(args: {
    name: THookName;
    type: THookType;
    handler: (v: THooks[THookType]["TGetLastHookReturnType"]) => TReturn;
  },
  ): ClientBuilder<
    TRouter,
    THooks & { [K in THookType]: { handler: (v: THooks[THookType]["TGetLastHookReturnType"]) => TReturn } }
  > {
    this.hooks[args.type].add({
      name: args.name,
      handler: args.handler,
    });
    return this;
  }

  beforeSend<
    TReturn,
    TName extends string,
  >(
    func: (arg: ifAny<THooks["beforeSend"]["TGetLastHookReturnType"], {}>) => TReturn,
    name: TName,
  ): ClientBuilder<
    TRouter,
    THooks & {
      beforeSend: Hooks<[
        ...THooks["beforeSend"]["v"],
        Hook<TName, (func: ifAny<THooks["beforeSend"]["TGetLastHookReturnType"], {}>) => TReturn>,
      ]>;
    }
  > {
    this.hooks.beforeSend.add({
      name,
      handler: func,
    });

    return this;
  }

  afterReceive<
    TReturn,
    TName extends string,
  >(
    func: (arg: ifAny<THooks["afterReceive"]["TGetLastHookReturnType"], { response: unknown }>) => TReturn,
    name: TName,
  ): ClientBuilder<
    TRouter,
    THooks & {
      afterReceive: Hooks<[
        ...THooks["afterReceive"]["v"],
        Hook<TName, (func: ifAny<THooks["afterReceive"]["TGetLastHookReturnType"], { response: unknown }>) => TReturn>,
      ]>;
    }
  > {
    this.hooks.afterReceive.add({
      name,
      handler: func,
    });

    return this;
  }

  onErrored<
    TReturn,
    TName extends string,
  >(
    func: (arg: ifAny<THooks["onErrored"]["TGetLastHookReturnType"], { error: unknown }>) => TReturn,
    name: TName,
  ): ClientBuilder<
    TRouter,
    THooks & {
      onErrored: Hooks<[
        ...THooks["onErrored"]["v"],
        Hook<TName, (func: ifAny<THooks["onErrored"]["TGetLastHookReturnType"], { error: unknown }>) => TReturn>,
      ]>;
    }
  > {
    this.hooks.onErrored.add({
      name,
      handler: func,
    });

    return this;
  }

  static empty() {
    return new ClientBuilder(
      {
        afterReceive: Hooks.empty(),
        beforeSend: Hooks.empty(),
        onErrored: Hooks.empty(),
      },
      {
        retries: 3,
      },
      {},
    );
  }

  createClient(): (url: string) => Client<TRouter> {
    return (url: string) => new Client(
      this.router,
      url,
      this.hooks,
    );
  }
}
