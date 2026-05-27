import { hash } from "bun";
import z from "zod/v4";

import { BlazyConstructor } from "src/app/constructors";

export const app = BlazyConstructor
  .createProd()
  .http({
    path: "/koko",
    handler: v => v,
    args: z.object({ v: z.string() }),
  })
  .post({
    path: "/jiji/koko",
    handler: (v) => {
      return "fr" as const;
    },
    args: z.object({ koko: z.string() }),
  })
  .post({
    path: "/jiji/pllp",
    handler: v => v,
    args: z.object({}),
  })
  .post({
    path: "/jiji",
    handler: v => v,
    args: z.object({ v: z.string() }),
    cache: {
      ttl: 2,
    },
  })
  .beforeRequestHandler(
    "generate unique id for each request and log the req",
    (ctx) => {
      const recievedAt = new Date();
      ctx;
      return {
        ...ctx,
        id: hash(JSON.stringify({
          recievedAt,
          ...ctx,
        })),
      };
    },
  );
