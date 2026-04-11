import { describe, expect, test } from "bun:test";
import type { RouteTree } from "@blazyts/backend-lib/src/core/server/router/types";
import type { IRouteHandler  } from "@blazyts/backend-lib/src/core/server/router/routeHandler/types";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { treeRouteFinder } from "src/route/finders";

describe("Tree Route Finder", () => {
    // Setup route handlers
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

    const rootHandler: IRouteHandler<Request, Response> = {
        handleRequest: (req) => ({ body: { message: "Root handler" } }),
        getClientRepresentation: undefined as any,
    };

    // Setup route tree
    const exampleRoutes: RouteTree = {
        "/": {"GET": rootHandler},
        users: {
            "/": {"GET": usersHandler

            } ,
            admin: {
                "/": {"GET":userAdminHandler},
            },
            ":id": {
                "/": {"GET": userByIdHandler},
                posts: {
                    "/": {"GET": postsHandler},
                },
            },
        },
    };

    test("should match root route", () => {
        const path = new Path("/");
        const handler = treeRouteFinder(exampleRoutes, path);
        expect(handler.isSome()).toBe(true);
        const result = handler.unpack("Handler not found").map(h => h.GET.handleRequest({ body: {} }));
        expect(result.v.body.message).toBe("Root handler");
    });

    test("should match static route /users", () => {
        const path = new Path("/users");
        const handler = treeRouteFinder(exampleRoutes, path);

        expect(handler.isSome()).toBe(true);
        const result = handler.unpack("Handler not found").map(h => h.GET.handleRequest({ body: {} }));
        expect(result.v.body.message).toBe("List all users");
    });

    test("should match static route /users/admin (prefer static over dynamic)", () => {
        const path = new Path("/users/admin");
        const handler = treeRouteFinder(exampleRoutes, path);

        expect(handler.isSome()).toBe(true);
        const result = handler.unpack("Handler not found").map(h => h.GET.handleRequest({ body: {} }));
        expect(result.v.body.message).toBe("Get admin user (static)");
    });

    test("should match dynamic route /users/:id", () => {
        const path = new Path("/users/123");
        const handler = treeRouteFinder(exampleRoutes, path);

        expect(handler.isSome()).toBe(true);
        const result = handler.unpack("Handler not found").map(h => h.GET.handleRequest({ body: {} }));
        expect(result.v.body.message).toBe("Get user by ID (dynamic)");
    });

    test("should match nested route /users/:id/posts", () => {
        const path = new Path("/users/123/posts");
        const handler = treeRouteFinder(exampleRoutes, path);

        expect(handler.isSome()).toBe(true);
        const result = handler.unpack("Handler not found").map(h => h.GET.handleRequest({ body: {} }));
        expect(result.v.body.message).toBe("Get user posts");
    });

    test("should return none for non-existent route", () => {
        const path = new Path("/users/123/comments");
        const handler = treeRouteFinder(exampleRoutes, path);

        expect(handler.isSome()).toBe(false);
    });

    test("should return none for incomplete path", () => {
        const path = new Path("/nonexistent");
        const handler = treeRouteFinder(exampleRoutes, path);

        expect(handler.isSome()).toBe(false);
    });

    describe("Static vs Dynamic Priority", () => {
        test("should prioritize static 'premium' over dynamic ':id'", () => {
            const routesWithPriority: RouteTree = {
                users: {
                    premium: {
                        "/": {
                            handleRequest: () => ({ body: { message: "Premium user (static)" } }),
                            getClientRepresentation: undefined as any,
                        },
                    },
                    ":id": {
                        "/": {
                            handleRequest: () => ({ body: { message: "User by ID (dynamic)" } }),
                            getClientRepresentation: undefined as any,
                        },
                    },
                },
            };

            const premiumPath = new Path("/users/premium");
            const premiumHandler = treeRouteFinder(routesWithPriority, premiumPath);

            expect(premiumHandler.isSome()).toBe(true);
            const result = premiumHandler.unpack("Handler not found").map(h => h.handleRequest({ body: {} }));
            expect(result.v.body.message).toBe("Premium user (static)");
        });

        test("should fallback to dynamic when static doesn't match", () => {
            const routesWithPriority: RouteTree = {
                users: {
                    premium: {
                        "/": {
                            handleRequest: () => ({ body: { message: "Premium user (static)" } }),
                            getClientRepresentation: undefined as any,
                        },
                    },
                    ":id": {
                        "/": {
                            handleRequest: () => ({ body: { message: "User by ID (dynamic)" } }),
                            getClientRepresentation: undefined as any,
                        },
                    },
                },
            };

            const dynamicPath = new Path("/users/john");
            const dynamicHandler = treeRouteFinder(routesWithPriority, dynamicPath);

            expect(dynamicHandler.isSome()).toBe(true);
            const result = dynamicHandler.unpack("Handler not found").map(h => h.handleRequest({ body: {} }));
            expect(result.raw.body.message).toBe("User by ID (dynamic)");
        });
    });

    describe("Multiple Dynamic Routes", () => {
        test("should match multiple dynamic segments in path", () => {
            const multiDynamicRoutes: RouteTree = {
                api: {
                    ":version": {
                        users: {
                            ":userId": {
                                "/": {
                                    handleRequest: () => ({ body: { message: "Version and user ID" } }),
                                    getClientRepresentation: undefined as any,
                                },
                            },
                        },
                    },
                },
            };

            const path = new Path("/api/v1/users/123");
            const handler = treeRouteFinder(multiDynamicRoutes, path);

            expect(handler.isSome()).toBe(true);
            const result = handler.unpack("Handler not found").map(h => h.handleRequest({ body: {} }));
            expect(result.raw.body.message).toBe("Version and user ID");
        });
    });

    describe("Edge Cases", () => {
        test("should handle route with only dynamic segments", () => {
            const dynamicOnlyRoutes: RouteTree = {
                ":category": {
                    ":id": {
                        "/": {
                            handleRequest: () => ({ body: { message: "Category and ID" } }),
                            getClientRepresentation: undefined as any,
                        },
                    },
                },
            };

            const path = new Path("/electronics/456");
            const handler = treeRouteFinder(dynamicOnlyRoutes, path);

            expect(handler.isSome()).toBe(true);
            const result = handler.unpack("Handler not found").map(h => h.handleRequest({ body: {} }));
            expect(result.raw.body.message).toBe("Category and ID");
        });

        test("should handle deeply nested routes", () => {
            const deepRoutes: RouteTree = {
                api: {
                    v1: {
                        users: {
                            ":userId": {
                                posts: {
                                    ":postId": {
                                        comments: {
                                            ":commentId": {
                                                "/": {
                                                    handleRequest: () => ({ body: { message: "Deep nested route" } }),
                                                    getClientRepresentation: undefined as any,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            };

            const path = new Path("/api/v1/users/123/posts/456/comments/789");
            const handler = treeRouteFinder(deepRoutes, path);

            expect(handler.isSome()).toBe(true);
            const result = handler.unpack("Handler not found").map(h => h.handleRequest({ body: {} }));
            expect(result.raw.body.message).toBe("Deep nested route");
        });

        test("should return none when path is longer than tree", () => {
            const shallowRoutes: RouteTree = {
                users: {
                    "/": usersHandler,
                },
            };

            const path = new Path("/users/extra/segments");
            const handler = treeRouteFinder(shallowRoutes, path);

            expect(handler.isSome()).toBe(false);
        });
    });
});
