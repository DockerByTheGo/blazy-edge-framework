import { describe, it, expect } from "bun:test";
import type { RouteTree } from "@blazyts/backend-lib/src/core/server/router/types";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { treeRouteFinder } from "src/route/finders";

describe("Tree Route Finder with Protocols", () => {
  it("should find protocol handlers at the end of path", () => {
    const routes: RouteTree = {
      api: {
        users: {
          "/": {
            POST: { handleRequest: () => "create user", getClientRepresentation: undefined as any, metadata: {} },
            GET: { handleRequest: () => "list users", getClientRepresentation: undefined as any, metadata: {} },
          },
        },
      },
    };

    const path = new Path("/api/users");
    const result = treeRouteFinder(routes, path);
    console.log("Result isSome:", result.isSome());
    console.log("Result unpacked:", result.unpack());
    console.log("Result unpacked keys:", Object.keys(result.unpack() || {}));

    expect(result.isSome()).toBe(true);
    const handlers = result.unpack().valueOf();
    expect(handlers.POST).toBeDefined();
    expect(handlers.GET).toBeDefined();
    console.log("✓ Found protocol handlers for /api/users");
  });

  it("should find websocket protocol handler", () => {
    const routes: RouteTree = {
      chat: {
        "/": {
          ws: {
            schema: { messagesItCanRecieve: {}, messagesItCanSend: {} },
            handleRequest: () => "websocket handler",
            getClientRepresentation: undefined as any,
            metadata: {},
          },
        },
      },
    };

    const path = new Path("/chat");
    const result = treeRouteFinder(routes, path);

    console.log("kook", result)
    expect(result.isSome()).toBe(true);
    const handlers = result.unpack().valueOf();
    expect(handlers.ws).toBeDefined();
    console.log("✓ Found websocket protocol handler for /chat");
  });

  it("should find protocol handlers in nested dynamic routes", () => {
    const routes: RouteTree = {
      api: {
        users: {
          ":id": {
            "/": {
              GET: { handleRequest: () => "get user", getClientRepresentation: undefined as any, metadata: {} },
              DELETE: { handleRequest: () => "delete user", getClientRepresentation: undefined as any, metadata: {} },
            },
          },
        },
      },
    };

    const path = new Path("/api/users/123");
    const result = treeRouteFinder(routes, path);

    expect(result.isSome()).toBe(true);
    const handlers = result.unpack().valueOf() as any;
    expect(handlers.GET).toBeDefined();
    expect(handlers.DELETE).toBeDefined();
    console.log("✓ Found protocol handlers in dynamic route /api/users/:id");
  });

  it("should prefer static routes over dynamic", () => {
    const routes: RouteTree = {
      users: {
        admin: {
          "/": {
            GET: { handleRequest: () => "admin user", getClientRepresentation: undefined as any, metadata: {} },
          },
        },
        ":id": {
          "/": {
            GET: { handleRequest: () => "dynamic user", getClientRepresentation: undefined as any, metadata: {} },
          },
        },
      },
    };

    const path = new Path("/users/admin");
    const result = treeRouteFinder(routes, path);

    expect(result.isSome()).toBe(true);
    const handlers = result.unpack().valueOf() as any;
    const response = handlers.GET?.handleRequest({});
    expect(response).toBe("admin user");
    console.log("✓ Correctly preferred static route over dynamic");
  });

  it("should return none when protocol handlers not found", () => {
    const routes: RouteTree = {
      api: {
        users: {
          "/": {
            POST: { handleRequest: () => "create", getClientRepresentation: undefined as any, metadata: {} },
          },
        },
      },
    };

    const path = new Path("/api/nonexistent");
    const result = treeRouteFinder(routes, path);

    expect(result.isSome()).toBe(false);
    console.log("✓ Correctly returned none for non-existent route");
  });

  it("should handle mixed protocol and path segments", () => {
    const routes: RouteTree = {
      api: {
        v1: {
          users: {
            ":userId": {
              posts: {
                ":postId": {
                  "/": {
                    GET: { handleRequest: () => "get post", getClientRepresentation: undefined as any, metadata: {} },
                    PUT: { handleRequest: () => "update post", getClientRepresentation: undefined as any, metadata: {} },
                  },
                },
              },
            },
          },
        },
      },
    };

    const path = new Path("/api/v1/users/123/posts/456");
    const result = treeRouteFinder(routes, path);

    expect(result.isSome()).toBe(true);
    const handlers = result.unpack().valueOf() as any;
    expect(handlers.GET).toBeDefined();
    expect(handlers.PUT).toBeDefined();
    console.log("✓ Found protocol handlers in deeply nested route");
  });
});
