import { Hooks } from "@blazyts/backend-lib";
import type { RequestData } from "@blazyts/backend-lib/src/core/server/types";

import { treeRouteFinder } from "../route/finders";

import { Blazy } from "./core";

type DefaultRouterHooks = {
  beforeHandler: ReturnType<typeof Hooks.empty>;
  afterHandler: ReturnType<typeof Hooks.empty>;
  onError: ReturnType<typeof Hooks.empty>;
  onStartup: ReturnType<typeof Hooks.empty>;
  onShutdown: ReturnType<typeof Hooks.empty>;
};

export class BlazyConstructor {
  static createEmpty(): Blazy<{}, DefaultRouterHooks> {
    return new Blazy({
      beforeHandler: Hooks.empty(),
      afterHandler: Hooks.empty(),
      onError: Hooks.empty(),
      onStartup: Hooks.empty(),
      onShutdown: Hooks.empty(),

    }, {} as any, treeRouteFinder);
    // .addService(CACHE_SERVICE_NAME, new CacheService())
    // .addService("logger", new LoggerService(new ConsoleLogSaver()))
    // .beforeRequestHandler("log", ctx => )
  }

  static createProd() {
    const app = BlazyConstructor
      .createEmpty();

    return app
      .beforeRequestHandler("attach", ctx => ({ ...(ctx as unknown as { reqData: RequestData }), services: app.services }));
  }
}
