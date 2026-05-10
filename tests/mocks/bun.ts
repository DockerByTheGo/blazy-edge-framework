export const fetch = globalThis.fetch.bind(globalThis);

export const password = {
  hash: async (value: string) => value,
  verify: async (_value: string, _hash: string) => true,
};

export class WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = WebSocket.OPEN;
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(_event: string, _listener: (...args: any[]) => void, _options?: unknown): void {}

  send(_data: string): void {}

  close(): void {
    this.readyState = WebSocket.CLOSED;
  }
}
