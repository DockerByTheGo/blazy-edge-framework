import type { RouteMAtcher } from "@blazyts/backend-lib";
import type { Optionable, TypeMarker } from "@blazyts/better-standard-library";

import { panicTypeOnlyVariable } from "@blazyts/better-standard-library";

import type { ExtractParams } from "src/route/matchers/dsl/types/extractParams";

export class NormalRouting<T extends string> implements RouteMAtcher<ExtractParams<T>> {
  type = "normal";

  constructor(private routeString: T) { }

  getRouteString() {
    return this.routeString;
  }

  TGetRouteString: T = (() => panicTypeOnlyVariable()) as any;

  typeInfo: TypeMarker<string>;

  match(path: string): Optionable<ExtractParams<T>> {
    return this.routeString === path ? this.routeString : undefined;
  }

  TGetContextType: ExtractParams<T>;
}
