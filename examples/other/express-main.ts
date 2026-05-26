import express, { type NextFunction, type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";

const cartService = {
    config: {},
    getAll: () => ["cart 1", "cart 2", "cart 3"],
};

const routeParamsSchema = z.object({
    "dynamic-param": z.string().min(1),
});

const routeQuerySchema = z.object({
    ko: z.string().optional(),
});

const newMessageSchema = z.object({
    userId: z.string().min(1),
});

type RequestWithExtras = Request & {
    hi: string;
    services: {
        cartService: typeof cartService;
    };
};

const validate =
    <T>(schema: z.ZodSchema<T>, source: "params" | "query" | "body") =>
        (req: Request, res: Response, next: NextFunction) => {
            const parsed = schema.safeParse(req[source]);

            if (!parsed.success) {
                res.status(400).json({
                    error: "validation_error",
                    issues: parsed.error.issues,
                });
                return;
            }

            req[source] = parsed.data as Request[typeof source];
            next();
        };

const app = express();

app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
    const ctx = req as RequestWithExtras;
    ctx.hi = "test";
    ctx.services = { cartService };
    next();
});

app.get(
    "/:dynamic-param",
    validate(routeParamsSchema, "params"),
    validate(routeQuerySchema, "query"),
    (req: Request, res: Response) => {
        const ctx = req as RequestWithExtras;

        res.json({
            dynamicParam: ctx.params["dynamic-param"],
            ko: ctx.query.ko,
            hi: ctx.hi,
            carts: ctx.services.cartService.getAll(),
        });
    },
);

const server = app.listen(3224, () => {
    console.log("Express example listening on http://localhost:3224");
});

const wsServer = new WebSocketServer({
    server,
    path: "/chat",
});

wsServer.on("connection", (socket: WebSocket) => {
    socket.on("message", rawMessage => {
        let message: unknown;

        try {
            message = JSON.parse(rawMessage.toString());
        } catch {
            socket.send(JSON.stringify({
                type: "error",
                body: { message: "Invalid JSON" },
            }));
            return;
        }

        const envelope = z.object({
            type: z.literal("newMessage"),
            body: newMessageSchema,
        }).safeParse(message);

        if (!envelope.success) {
            socket.send(JSON.stringify({
                type: "error",
                body: {
                    message: "Invalid message",
                    issues: envelope.error.issues,
                },
            }));
            return;
        }

        socket.send(JSON.stringify({
            type: "newMessage",
            body: {
                hi45: `accepted user ${envelope.data.body.userId}`,
            },
        }));
    });
});
