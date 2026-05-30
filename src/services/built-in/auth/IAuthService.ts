import type { SimpleResult } from "@blazyts/better-standard-library";

export type TokenResult = {
  token: string;
  expiresAt: number;
};

export type AuthServiceError = "expired" | "invalid" | "failed";
export type IssueTokenResult = SimpleResult<TokenResult, "invalid" | "failed">;
export type VerifyTokenResult = SimpleResult<TokenResult, AuthServiceError>;

export type IAuthService = {
  config: Record<string, unknown>;
  issueToken: (userId: string) => Promise<IssueTokenResult>;
  verifyToken: (token: string) => Promise<VerifyTokenResult>;
};
