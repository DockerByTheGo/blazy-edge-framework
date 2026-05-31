import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";
import { JsonResponse } from "src/route/handlers/variations/http/responses";

function request(app: { route: (request: { reqData: any }) => Promise<unknown> }, url: string, protocol: string = "GET") {
  return app.route({
    reqData: {
      url,
      protocol,
      verb: protocol,
      body: {},
      headers: {},
    },
  });
}

describe("not found routes", () => {
  it("returns a friendly 404 when no route matches", async () => {
    const app = BlazyConstructor.createEmpty();
    const response = await request(app, "/missing") as Response;

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      type: "not_found",
      body: {
        message: "No route found for GET /missing",
        reason: "route",
        method: "GET",
        path: "/missing",
        availableProtocols: [],
      },
    });
  });

  it("returns a friendly 404 when the route exists but the method does not", async () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users",
      handler: () => ({ ok: true }),
    });
    const response = await request(app, "/users", "GET") as Response;

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      type: "not_found",
      body: {
        message: "No GET handler found for /users",
        reason: "method",
        method: "GET",
        path: "/users",
        availableProtocols: ["POST"],
      },
    });
  });

  it("lets apps override not found behavior", async () => {
    const app = BlazyConstructor
      .createEmpty()
      .onNotFound(ctx =>
        JsonResponse({
          custom: true,
          reason: ctx.reason,
          path: ctx.request.path,
        }, { status: 418 }),
      );

    const response = await request(app, "/custom") as Response;

    expect(response.status).toBe(418);
    await expect(response.json()).resolves.toEqual({
      custom: true,
      reason: "route",
      path: "/custom",
    });
  });
});
