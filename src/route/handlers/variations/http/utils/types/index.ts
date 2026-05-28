export type RawRequestData<TBody = unknown> = {
  url?: string;
  protocol?: string;
  verb?: string;
  headers?: Record<string, string>;
  body?: TBody;
};
