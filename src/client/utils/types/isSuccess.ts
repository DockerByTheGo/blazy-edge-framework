import type { Range200to300 } from "@blazyts/better-standard-library";

export type isSuccess<T extends number> = T extends Range200to300 ? true : false;
