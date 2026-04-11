import { Optionable, TypeMarker } from "@blazyts/better-standard-library";

import type { RouteMAtcher } from "../../types";
/*

if it returns nullable optionable it means that the route is not matching
*/
class Custom<ctxProviderReturn> implements RouteMAtcher<ctxProviderReturn> {
  constructor(private ctxProvider: (path: string) => Optionable<ctxProviderReturn>) {}
  TGetContextType: ctxProviderReturn;
  typeInfo = new TypeMarker("Custom");
  match(path: string): Optionable<ctxProviderReturn> {
    return this.ctxProvider(path);
  }

  getRouteString(): string {
    return "";
  }
}

// Exampe
const custom = new Custom((path) => {
  if (path.indexOf("/api") !== 0)
    return Optionable.none();
  return Optionable.new({ userId: path.split("/")[2] });
});
