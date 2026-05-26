import { z } from "zod/v4";
import { BlazyConstructor } from "src/app/constructors";
import { tap } from "src/hooks";
import { JsonResponse, TextResponse } from "src/response";
import { servicify } from "src/services";
import { Message } from "src/route/handlers/variations/websocket/types";

type RequestContext = {
  reqData: {
    url: string;
    protocol: string;
    verb: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  requestId: string;
  user: {
    id: string;
    role: string;
  };
  tenant: {
    id: string;
    region: string;
  };
  services: {
    audit: AuditService;
    inventory: InventoryService;
    orders: OrdersService;
  };
};

type CartItem = {
  sku: string;
  quantity: number;
};

class AuditService {
  config = {
    sink: "console",
    sampleRate: 1,
  };

  private events: Array<Record<string, unknown>> = [];

  record(event: Record<string, unknown>) {
    this.events.push({ ...event, at: new Date().toISOString() });
    return { accepted: true, totalEvents: this.events.length };
  }

  recent() {
    return this.events.slice(-10);
  }
}

class InventoryService {
  config = {
    warehouse: "eu-central-demo",
  };

  private stock = new Map([
    ["coffee-beans", 42],
    ["paper-filters", 300],
    ["travel-mug", 18],
  ]);

  reserve(args: CartItem & { requestId: string }) {
    const available = this.stock.get(args.sku) ?? 0;
    const reserved = Math.min(available, args.quantity);
    this.stock.set(args.sku, available - reserved);

    return {
      sku: args.sku,
      requested: args.quantity,
      reserved,
      remaining: this.stock.get(args.sku) ?? 0,
      requestId: args.requestId,
    };
  }

  list() {
    return Array.from(this.stock.entries()).map(([sku, available]) => ({
      sku,
      available,
    }));
  }
}

class OrdersService {
  config = {
    currency: "EUR",
  };

  private orders: Array<{
    id: string;
    storeId: string;
    cartId: string;
    items: CartItem[];
    userId: string;
  }> = [];

  checkout(args: {
    storeId: string;
    cartId: string;
    items: CartItem[];
    userId: string;
  }) {
    const order = {
      id: `order_${this.orders.length + 1}`,
      ...args,
    };

    this.orders.push(order);
    return order;
  }

  listForUser(args: { userId: string }) {
    return this.orders.filter(order => order.userId === args.userId);
  }
}

const audit = new AuditService();
const inventory = new InventoryService();
const orders = new OrdersService();

const instrumentedInventory = servicify(inventory);
instrumentedInventory.methods.reserve.onCalled(({ args, result }) => {
  audit.record({
    type: "service.inventory.reserve",
    sku: args.sku,
    quantity: args.quantity,
    reserved: result.reserved,
  });
});

const quoteCart = {
  name: "quoteCart",
  argsSchema: {},
  returnTypeSchema: {},
  execute(args: { items: CartItem[]; coupon?: string }) {
    const subtotal = args.items.reduce(
      (total, item) => total + item.quantity * 12,
      0,
    );
    const discount = args.coupon === "BLAZY10" ? subtotal * 0.1 : 0;

    return {
      subtotal,
      discount,
      total: subtotal - discount,
      currency: orders.config.currency,
    };
  },
};

const app = BlazyConstructor
  .createProd()
  .addService("audit", audit)
  .addService("inventory", inventory)
  .addService("orders", orders)
  .beforeRequestHandler("trace-request", ctx => ({
    ...ctx,
    requestId: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
  }))
  .beforeRequestHandler("resolve-tenant", ctx => {
    const headers = ctx.reqData.headers ?? {};

    return {
      ...ctx,
      tenant: {
        id: headers["x-tenant-id"] ?? "demo-store",
        region: headers["x-region"] ?? "eu",
      },
    };
  })
  .beforeRequestHandler("authenticate", ctx => {
    const headers = ctx.reqData.headers ?? {};
    const token = headers.authorization?.replace("Bearer ", "");
    const isAdmin = token === "demo-admin-token";

    return {
      ...ctx,
      user: {
        id: token ? `user_${token.slice(0, 6)}` : "guest",
        role: isAdmin ? "admin" : token ? "member" : "guest",
      },
    };
  })
  .beforeRequestHandler(
    "audit-request",
    tap<any>(ctx => audit.record({
      type: "hook.beforeHandler",
      requestId: ctx.requestId,
      path: new URL(ctx.reqData.url).pathname,
      userId: ctx.user.id,
      tenantId: ctx.tenant.id,
    })),
  )
  .block(app => {
    app.afterHandler("audit-response", response => {
      audit.record({
        type: "hook.afterHandler",
        returnedNativeResponse: response instanceof Response,
      });

      return response instanceof Response
        ? { response }
        : { response };
    });

    app.onError({
      name: "json-error",
      handler: error => ({
        error: "internal_error",
        message: error instanceof Error ? error.message : String(error),
      }),
    });

    app.onStartup({
      name: "warm-inventory-cache",
      handler: () => ({
        warmedSkus: inventory.list().map(item => item.sku),
      }),
    });

    app.onShutdown({
      name: "flush-audit-log",
      handler: () => ({
        flushedEvents: audit.recent().length,
      }),
    });

    return app;
  })
  .get({
    path: "/health14579",
    args: undefined,
    handler: (ctx: RequestContext) => ({
      body: {
        ok: true,
        requestId: ctx.requestId,
        tenant: ctx.tenant,
      },
    }),
  })
  .get({
    path: "/inventory",
    args: undefined,
    cache: {
      ttl: 15_000,
      key: (ctx: RequestContext) => ctx.tenant.id,
    },
    handler: (ctx: RequestContext) => ({
      body: {
        tenant: ctx.tenant,
        items: ctx.services.inventory.list(),
      },
    }),
  })
  .get({
    path: "/users/:userId/orders",
    args: undefined,
    handler: (ctx: RequestContext & { userId: string }) => ({
      body: {
        userId: ctx.userId,
        orders: ctx.services.orders.listForUser({ userId: ctx.userId }),
      },
    }),
  })
  .post({
    path: "/stores/:storeId/carts/:cartId/items",
    args: z.object({
      storeId: z.string(),
      cartId: z.string(),
      sku: z.string(),
      quantity: z.number().int().positive(),
    }),
    handeler: (ctx: RequestContext & {
      storeId: string;
      cartId: string;
      sku: string;
      quantity: number;
    }) => {
      const reservation = ctx.services.inventory.reserve({
        sku: ctx.sku,
        quantity: ctx.quantity,
        requestId: ctx.requestId,
      });

      return {
        body: {
          cartId: ctx.cartId,
          storeId: ctx.storeId,
          reservation,
        },
      };
    },
  })
  .post({
    path: "/stores/:storeId/carts/:cartId/checkout",
    handeler: (ctx: RequestContext & {
      storeId: string;
      cartId: string;
      body: { items: CartItem[] };
    }) => ({
      body: ctx.services.orders.checkout({
        storeId: ctx.storeId,
        cartId: ctx.cartId,
        items: ctx.body.items,
        userId: ctx.user.id,
      }),
    }),
  })
  .rpc({
    name: "reserveInventory",
    args: z.object({
      sku: z.string(),
      quantity: z.number().int().positive(),
      requestId: z.string().default("rpc-request"),
    }),
    handler: args => ({
      body: inventory.reserve(args),
    }),
  })
  .rpcFromFunction(quoteCart as any)
  .http({
    path: "/admin/audit/recent",
    meta: {
      protocol: "GET",
      verb: "GET",
    },
    handler: (ctx: RequestContext) => {
      if (ctx.user.role !== "admin") {
        return JsonResponse({ error: "admin_only" }, { status: 403 });
      }

      return JsonResponse({
        events: ctx.services.audit.recent(),
      });
    },
  })
  .html({
    path: "/demo",
    html: `
      <main>
        <h1>Blazy Edge Storefront</h1>
        <p>Try GET /health, GET /inventory, POST /stores/demo/carts/demo/items, or POST /rpc/quoteCart.</p>
      </main>
    `,
  })
  .get({
    path: "/robots.txt",
    args: undefined,
    handler: () => TextResponse("User-agent: *\nAllow: /\n"),
  })
  .ws({
    path: "/stores/:storeId/live-cart",
    messages: {
      messagesItCanRecieve: {
        joinCart: new Message(
          z.object({
            cartId: z.string(),
          }),
          ({ data, ws }) => {
            ws.send(JSON.stringify({
              type: "cartJoined",
              body: {
                cartId: data.cartId,
              },
            }));
          },
        ),
        addItem: new Message(
          z.object({
            cartId: z.string(),
            sku: z.string(),
            quantity: z.number().int().positive(),
          }),
          ({ data, ws }) => {
            const reservation = inventory.reserve({
              sku: data.sku,
              quantity: data.quantity,
              requestId: "ws-message",
            });

            ws.send(JSON.stringify({
              type: "itemReserved",
              body: reservation,
            }));
          },
        ),
      },
      messagesItCanSend: {
        cartJoined: new Message(
          z.object({
            cartId: z.string(),
          }),
          () => {},
        ),
        itemReserved: new Message(
          z.object({
            sku: z.string(),
            reserved: z.number(),
            remaining: z.number(),
          }),
          () => {},
        ),
      },
    } as any,
  });

const client = app.createClient().createClient()("http://localhost:3000");

client.invoke.health14579["/"].GET();
client.invoke.admin.audit.recent["/"].GET({})
client.invoke.inventory["/"].GET;

client.invoke.admin.audit.recent["/"].GET()


if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000);
  app.listen(port);
  console.log(`Blazy Edge storefront example listening on http://localhost:${port}`);
}

export { app, client };
const a:A = {}