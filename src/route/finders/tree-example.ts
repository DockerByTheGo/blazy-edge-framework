import { treeRouteFinder } from "./tree";
import type { RouteTree } from "@blazyts/backend-lib/src/core/server/router/types";
import type { IRouteHandler, Request, Response } from "@blazyts/backend-lib/src/core/server/router/routeHandler/types";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";

/**
 * Example demonstrating the tree route finder behavior:
 * 
 * 1. Static routes take priority over dynamic routes
 * 2. Routes are matched using a tree structure
 * 3. Dynamic routes (starting with ':') are checked only if no static match exists
 */

// Example route handlers
const usersHandler: IRouteHandler<Request, Response> = {
    handleRequest: (req) => ({ body: { message: "List all users" } }),
    getClientRepresentation: undefined as any,
};

const userByIdHandler: IRouteHandler<Request, Response> = {
    handleRequest: (req) => ({ body: { message: "Get user by ID (dynamic)" } }),
    getClientRepresentation: undefined as any,
};

const userAdminHandler: IRouteHandler<Request, Response> = {
    handleRequest: (req) => ({ body: { message: "Get admin user (static)" } }),
    getClientRepresentation: undefined as any,
};

const postsHandler: IRouteHandler<Request, Response> = {
    handleRequest: (req) => ({ body: { message: "Get user posts" } }),
    getClientRepresentation: undefined as any,
};

const exampleRoutes: RouteTree = {
    users: {
        // Static handler for /users
        "/": usersHandler,

        // Static route /users/admin (hardcoded)
        admin: {
            "/": userAdminHandler,
        },

        // Dynamic route /users/:id
        ":id": {
            // Handler for /users/:id
            "/": userByIdHandler,

            // Nested route /users/:id/posts
            posts: {
                "/": postsHandler,
            },
        },
    },
};

const testCases = [
    { path: "/users", expected: "List all users" },
    { path: "/users/admin", expected: "Get admin user (static)" }, // Static route preferred
    { path: "/users/123", expected: "Get user by ID (dynamic)" },   // Falls back to dynamic
    { path: "/users/123/posts", expected: "Get user posts" },
];

console.log("Tree Route Finder Examples:\n");

for (const testCase of testCases) {
    const path = new Path(testCase.path);
    const handler = treeRouteFinder(exampleRoutes, path);

    if (handler.isSome()) {
        const result = handler.unpack("Handler not found")
            .map(h => h({ body: {} }));
        console.log(`✓ ${testCase.path} → ${JSON.stringify(result)}`);
    } else {
        console.log(`✗ ${testCase.path} → No match found`);
    }
}