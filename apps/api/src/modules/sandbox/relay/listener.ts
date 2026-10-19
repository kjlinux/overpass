/** The part of pg.Client the listener relies on, so tests can inject a fake. */
export type ListenClient = {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  connect(): Promise<unknown>;
  query(sql: string, values?: unknown[]): Promise<unknown>;
  end(): Promise<void>;
};

export type ListenerOptions = {
  create: () => ListenClient;
  channel: string;
  retryMs: number;
  maxRetryMs: number;
  log: { error(details: unknown, message?: string): void };
  onNotification: (payload: string | undefined) => void;
  onReconnect: () => void;
};

const quietly = (client: ListenClient) => void client.end().catch(() => undefined);

/** Keeps one LISTEN connection alive: capped backoff until closed, and a signal after each loss. */
export class PostgresListener {
  private current: ListenClient | undefined;
  private ready: ListenClient | undefined;
  private timer: NodeJS.Timeout | undefined;
  private closed = false;
  private lost = false;
  private failures = 0;

  constructor(private readonly options: ListenerOptions) {}

  start(): void {
    void this.connect();
  }

  async query(sql: string, values: unknown[]): Promise<void> {
    await this.ready?.query(sql, values);
  }

  async close(): Promise<void> {
    this.closed = true;
    clearTimeout(this.timer);
    await this.current?.end();
  }

  private async connect(): Promise<void> {
    if (this.closed) return;
    const next = this.options.create();
    this.current = next;
    next.on("notification", (message) => {
      this.options.onNotification((message as { payload?: string }).payload);
    });
    next.on("error", (error) => {
      this.retire(next, error);
    });
    next.on("end", () => {
      this.retire(next);
    });
    try {
      await next.connect();
      await next.query(`listen ${this.options.channel}`);
    } catch (error) {
      this.retire(next, error);
      return;
    }
    this.settle(next);
  }

  private settle(client: ListenClient): void {
    if (this.closed || this.current !== client) {
      quietly(client);
      return;
    }
    this.ready = client;
    this.failures = 0;
    const recovered = this.lost;
    this.lost = false;
    if (recovered) this.options.onReconnect();
  }

  private retire(client: ListenClient, error?: unknown): void {
    if (client !== this.current) return;
    this.current = undefined;
    this.ready = undefined;
    this.lost = true;
    if (error !== undefined)
      this.options.log.error({ err: error }, "relay listener lost its connection");
    quietly(client);
    if (!this.closed && this.timer === undefined) this.schedule();
  }

  private schedule(): void {
    const { retryMs, maxRetryMs } = this.options;
    const delay = Math.min(retryMs * 2 ** this.failures, maxRetryMs);
    this.failures += 1;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.connect();
    }, delay);
  }
}
