type LoopWorker = {
  runOnce(): Promise<number>;
  purge(): Promise<unknown>;
};

type LoopOptions = { pollMs: number; purgeMs: number };
type LoopLog = { error(details: unknown, message?: string): void };
type LoopState = { stopped: boolean };

export const defaultLoop: LoopOptions = { pollMs: 1000, purgeMs: 3_600_000 };

/** A wait between polls that stop() can cut short. */
function interruptibleWait(state: LoopState, pollMs: number) {
  let wake: (() => void) | undefined;
  const pause = () =>
    new Promise<void>((resolve) => {
      if (state.stopped) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, pollMs);
      wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  return { pause, wake: () => wake?.() };
}

/** Polls the queue until stopped; a full batch is followed at once by the next one. */
export function startWorkerLoop(worker: LoopWorker, options: LoopOptions, log: LoopLog) {
  const state: LoopState = { stopped: false };
  const wait = interruptibleWait(state, options.pollMs);
  let lastPurge = Number.NEGATIVE_INFINITY;

  async function tick(): Promise<void> {
    if (Date.now() - lastPurge >= options.purgeMs) {
      await worker.purge();
      lastPurge = Date.now();
    }
    while (!state.stopped && (await worker.runOnce()) > 0);
  }

  const running = (async () => {
    while (!state.stopped) {
      try {
        await tick();
      } catch (error) {
        log.error({ err: error }, "sandbox delivery batch failed");
      }
      await wait.pause();
    }
  })();

  return {
    async stop(): Promise<void> {
      state.stopped = true;
      wait.wake();
      await running;
    },
  };
}
