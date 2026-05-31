import { describe, expect, it } from "vitest";

import { listenWithPortFallback } from "../helpers/ports";
import { createE2eClient } from "./client";
import { createE2eServerApp } from "./server";

function waitForOpen(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("WebSocket failed to open")), { once: true });
  });
}

function waitForMessage(socket: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    socket.addEventListener("message", event => resolve(JSON.parse(String(event.data))), { once: true });
    socket.addEventListener("error", () => reject(new Error("WebSocket errored while waiting for a message")), { once: true });
  });
}

describe("e2e app", () => {
  it("serves typed HTTP routes and WebSocket messages over a real Bun server", async () => {
    const { app, events } = createE2eServerApp();
    const server = listenWithPortFallback(port => app.listen(port), [3020, 3021, 3022]);
    const client = createE2eClient(app, server.port);

    try {
      const created = await client.invoke.orders("ord_123").items["/"].POST({
        sku: "keyboard",
        qty: 2,
      });

      expect(created.raw.response.status).toBe(202);
      expect(created.raw.response.body.raw()).toEqual({
        orderId: "ord_123",
        sku: "keyboard",
        qty: 2,
        requestId: expect.any(String),
        path: "/orders/ord_123/items",
        method: "POST",
      });
      expect(created.raw.whatwg().status).toBe(202);

      const health = await fetch(`http://localhost:${server.port}/health`);
      await expect(health.json()).resolves.toEqual({
        ok: true,
        checks: ["router", "http"],
      });
      expect(health.status).toBe(201);

      const invalid = await fetch(`http://localhost:${server.port}/orders/ord_123/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku: "", qty: 0 }),
      });
      const invalidBody = await invalid.json();

      expect(invalid.status).toBe(400);
      expect(invalidBody).toMatchObject({
        type: "validation_failed",
        body: {
          message: "Request validation failed",
          fieldErrors: {
            sku: expect.any(Array),
            qty: expect.any(Array),
          },
        },
      });

      const socket = new WebSocket(`ws://localhost:${server.port}/rooms`);
      try {
        await waitForOpen(socket);

        const nextMessage = waitForMessage(socket);
        socket.send(JSON.stringify({
          type: "join-room",
          path: "/rooms",
          body: {
            roomId: "blue-room",
            userId: "ada",
          },
        }));

        await expect(nextMessage).resolves.toEqual({
          type: "room-joined",
          path: "/rooms",
          body: {
            roomId: "blue-room",
            userId: "ada",
            members: 1,
          },
        });
      }
      finally {
        socket.close();
      }

      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: "before-request",
          method: "POST",
          path: "/orders/ord_123/items",
        }),
        expect.objectContaining({
          type: "order-created",
          orderId: "ord_123",
          sku: "keyboard",
          qty: 2,
        }),
        {
          type: "room-joined",
          roomId: "blue-room",
          userId: "ada",
        },
      ]));
    }
    finally {
      server.stop?.();
    }
  });
});
