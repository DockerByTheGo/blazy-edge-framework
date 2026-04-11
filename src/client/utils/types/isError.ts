import type { Range400to499 } from "@blazyts/better-standard-library";

export type isError<T extends number> = T extends Range400to499 ? true : false;
