import type { IResultable, Optionable } from "@blazyts/better-standard-library";

import type { ServiceDefault } from "src/services/main";

export type TokenResult = {
  token: string;
  expiresAt: number;
};

export type IAuthService = {
  issueToken: (userId: string) => Promise<Optionable<TokenResult>>;
  verifyToken: (token: string) => Promise<IResultable<TokenResult, ["expired", "invalid"]>>;
} & ServiceDefault;
