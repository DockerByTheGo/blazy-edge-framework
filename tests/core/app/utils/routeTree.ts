export function getRouteNode(routes: Record<string, any>, path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .reduce((node, segment) => node?.[segment], routes);
}

export function getProtocols(routes: Record<string, any>, path: string) {
  return getRouteNode(routes, path)?.["/"];
}
