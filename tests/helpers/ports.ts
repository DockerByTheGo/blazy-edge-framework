const DEFAULT_FALLBACK_PORTS = [
  3005,
  3006,
  3007,
  3008,
  3009,
  3010,
  3011,
  3012,
  3013,
  3014,
];

export class PortFallbackIterator {
  private index = 0;
  public readonly tried: number[] = [];

  constructor(private readonly ports: number[] = DEFAULT_FALLBACK_PORTS) {}

  next(): number {
    const port = this.ports[this.index];
    this.index += 1;

    if (port === undefined) {
      throw new Error(`all fallback ports are in use: ${this.tried.join(", ")}`);
    }

    this.tried.push(port);
    return port;
  }
}

export function createPortFallbackIterator(ports: number[] = DEFAULT_FALLBACK_PORTS) {
  return new PortFallbackIterator(ports);
}

export function listenWithPortFallback<TServer extends { port: number }>(
  listen: (port: number) => TServer,
  ports?: number[],
): TServer {
  const portFallbacks = createPortFallbackIterator(ports);
  let lastError: unknown;

  while (true) {
    let port: number;
    try {
      port = portFallbacks.next();
    }
    catch {
      throw new Error(
        `all fallback ports are in use: ${portFallbacks.tried.join(", ")}`,
        { cause: lastError },
      );
    }

    try {
      return listen(port);
    }
    catch (error) {
      lastError = error;
    }
  }
}
