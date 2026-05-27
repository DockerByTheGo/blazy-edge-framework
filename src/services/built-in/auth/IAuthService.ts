export type TokenResult = {
  token: string;
  expiresAt: number;
};

export type ServiceResult<TValue, TError extends string> =
  | {
      isOk: () => true;
      isError: () => false;
      value: TValue;
      unpack: () => TValue;
    }
  | {
      isOk: () => false;
      isError: () => true;
      error: TError;
      unpack: () => never;
    };

export type IAuthService = {
  config: Record<string, unknown>;
  issueToken: (userId: string) => Promise<TokenResult | null>;
  verifyToken: (token: string) => Promise<ServiceResult<TokenResult, "expired" | "invalid">>;
};
