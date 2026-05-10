import "reflect-metadata";
import {
    BadRequestException,
    Controller,
    Get,
    Injectable,
    MiddlewareConsumer,
    Module,
    NestModule,
    Param,
    PipeTransform,
    Query,
    Req,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { z } from "zod";

const routeParamsSchema = z.object({
    "dynamic-param": z.string().min(1),
});

const routeQuerySchema = z.object({
    ko: z.string().optional(),
});

const newMessageSchema = z.object({
    userId: z.string().min(1),
});

type RequestWithExtras = {
    hi: string;
    services: {
        cartService: CartService;
    };
};

class ZodPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: z.ZodSchema<T>) {}

    transform(value: unknown): T {
        const parsed = this.schema.safeParse(value);

        if (!parsed.success) {
            throw new BadRequestException({
                error: "validation_error",
                issues: parsed.error.issues,
            });
        }

        return parsed.data;
    }
}

class ZodWsPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: z.ZodSchema<T>) {}

    transform(value: unknown): T {
        const parsed = this.schema.safeParse(value);

        if (!parsed.success) {
            throw new WsException({
                error: "validation_error",
                issues: parsed.error.issues,
            });
        }

        return parsed.data;
    }
}

@Injectable()
class CartService {
    config = {};

    getAll() {
        return ["cart 1", "cart 2", "cart 3"];
    }
}

@Injectable()
class RequestContextMiddleware {
    constructor(private readonly cartService: CartService) {}

    use(req: RequestWithExtras, _res: unknown, next: () => void) {
        req.hi = "test";
        req.services = {
            cartService: this.cartService,
        };
        next();
    }
}

@Controller()
class CartController {
    @Get(":dynamic-param")
    getCarts(
        @Param(new ZodPipe(routeParamsSchema))
        params: z.infer<typeof routeParamsSchema>,
        @Query(new ZodPipe(routeQuerySchema))
        query: z.infer<typeof routeQuerySchema>,
        @Req()
        req: RequestWithExtras,
    ) {
        return {
            dynamicParam: params["dynamic-param"],
            ko: query.ko,
            hi: req.hi,
            carts: req.services.cartService.getAll(),
        };
    }
}

@WebSocketGateway({
    path: "/chat",
    cors: false,
})
class ChatGateway {
    @WebSocketServer()
    server!: Server;

    @SubscribeMessage("newMessage")
    handleNewMessage(
        @MessageBody(new ZodWsPipe(newMessageSchema))
        data: z.infer<typeof newMessageSchema>,
        @ConnectedSocket()
        client: Socket,
    ) {
        client.emit("newMessage", {
            hi45: `accepted user ${data.userId}`,
        });
    }
}

@Module({
    controllers: [CartController],
    providers: [CartService, RequestContextMiddleware, ChatGateway],
})
class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestContextMiddleware).forRoutes("*");
    }
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(3225);
    console.log("Nest example listening on http://localhost:3225");
}

void bootstrap();
