import type { RouteFinder } from "@blazyts/backend-lib/src/core/server/router/Router";
import type { IRouteHandler, Request } from "@blazyts/backend-lib/src/core/server/router/routeHandler/types";
import type { RouteTree } from "@blazyts/backend-lib/src/core/server/router/types";
import type { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { Optionable } from "@blazyts/better-standard-library";

/**
 * Checks if a route segment is dynamic (starts with ':')
 */
const isDynamic = (segment: string): boolean => segment.startsWith(":");

/**
 * Checks if a value is a route handler
 */
const isRouteHandler = (value: any): value is IRouteHandler<Request, any> => {
    return value && typeof value === "object" && "handleRequest" in value;
};

/**
 * Checks if a value is a protocol handlers object (contains protocol keys like POST, GET, ws)
 */
const isProtocolHandlers = (value: any): boolean => {
    if (!value || typeof value !== "object") return false;
    // Check if it contains protocol keys
    const protocols = ['POST', 'GET', 'PUT', 'DELETE', 'PATCH', 'ws', 'http'];
    return Object.keys(value).some(key => protocols.includes(key));
};

const wrapHandlerContextWithParams = (
    handler: IRouteHandler<Request, any>,
    params: Record<string, string>,
): IRouteHandler<Request, any> => {
    if (Object.keys(params).length === 0) {
        return handler;
    }

    return {
        ...handler,
        handleRequest: (ctx: Request = {} as Request) => {
            const nextCtx = {
                ...ctx,
                ...params,
                params: {
                    ...(ctx as Record<string, unknown>)?.params as Record<string, string> | undefined,
                    ...params,
                },
            };

            return handler.handleRequest(nextCtx);
        },
    };
};

const wrapProtocolHandlersWithParams = (
    handlers: Record<string, IRouteHandler<Request, any>>,
    params: Record<string, string>,
) => {
    if (Object.keys(params).length === 0) {
        return handlers;
    }

    return Object.fromEntries(
        Object.entries(handlers).map(([protocol, handler]) => [
            protocol,
            wrapHandlerContextWithParams(handler, params),
        ]),
    );
};

/**
 * Tree-based route finder that:
 * 1. Traverses the route tree structure to find the path
 * 2. Distinguishes between static and dynamic routes
 * 3. Prefers static (hardcoded) routes over dynamic routes when both exist
 * 4. At the end of the path, looks for "/" key containing protocol handlers
 * 5. Returns the protocol handlers object
 * 
 * Example structure:
 * {
 *   users: {
 *     "/": {
 *       "POST": usersListHandler,    // Handler for POST /users
 *       "GET": usersListHandler      // Handler for GET /users
 *     },
 *     admin: {
 *       "/": {
 *         "GET": adminHandler        // Handler for GET /users/admin
 *       }
 *     },
 *     ":id": {
 *       "/": {
 *         "GET": userByIdHandler     // Handler for GET /users/:id
 *       },
 *       posts: {
 *         "/": {
 *           "GET": userPostsHandler  // Handler for GET /users/:id/posts
 *         }
 *       }
 *     }
 *   }
 * }
 */
export const treeRouteFinder: RouteFinder<RouteTree> = (routesTree, path) => {
    const pathParts = path.parts.map(part => part.part);
    /**
     * Recursively traverse the route tree to find the path endpoint
     * @param currentNode - Current node in the route tree
     * @param remainingParts - Remaining path segments to match
     * @returns The protocol handlers object if found, or null
     */
    const traverse = (
        currentNode: RouteTree,
        remainingParts: string[],
        collectedParams: Record<string, string> = {},
    ): Optionable<any> => {
        // If no more parts to match, check if current node has a "/" with protocol handlers
        if (remainingParts.length === 0) {
            const protocolHandlers = currentNode["/"];
            if (protocolHandlers && isProtocolHandlers(protocolHandlers)) {
                return Optionable.some(wrapProtocolHandlersWithParams(protocolHandlers, collectedParams));
            }
            // Fallback: if "/" contains a single handler (old structure), return it
            if (protocolHandlers && isRouteHandler(protocolHandlers)) {
                return Optionable.some(wrapHandlerContextWithParams(protocolHandlers, collectedParams));
            }
            return Optionable.none();
        }

        const [currentPart, ...restParts] = remainingParts;

        // Try static (hardcoded) route first
        if (currentPart && currentNode[currentPart]) {
            const staticResult = traverse(currentNode[currentPart] as RouteTree, restParts, collectedParams);
            if (staticResult.isSome()) {
                return staticResult;
            }
        }

        // If no static match found, try dynamic routes
        const dynamicSegments = Object.keys(currentNode).filter(isDynamic);

        for (const dynamicSegment of dynamicSegments) {
            const paramName = dynamicSegment.slice(1);
            const dynamicResult = traverse(
                currentNode[dynamicSegment] as RouteTree,
                restParts,
                {
                    ...collectedParams,
                    [paramName]: currentPart,
                },
            );
            if (dynamicResult.isSome()) {
                return dynamicResult;
            }
        }

        // No match found
        return Optionable.none();
    };

    return traverse(routesTree, pathParts);
};
