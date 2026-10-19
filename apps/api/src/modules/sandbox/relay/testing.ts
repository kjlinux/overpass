export type StreamMessage = { event: string; id: string | undefined; data: unknown };

export type Stream = { next(): Promise<StreamMessage>; close(): void };

function parseFrame(frame: string): StreamMessage | undefined {
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("id: ")) id = line.slice(4);
    else if (line.startsWith("data: ")) data.push(line.slice(6));
  }
  return data.length === 0 ? undefined : { event, id, data: JSON.parse(data.join("\n")) };
}

/** A minimal SSE reader for tests: one parsed message per next(), comments skipped. */
export async function openStream(base: string, key: string, lastEventId?: string): Promise<Stream> {
  const controller = new AbortController();
  const headers: Record<string, string> = {
    authorization: `Bearer ${key}`,
    accept: "text/event-stream",
  };
  if (lastEventId !== undefined) headers["last-event-id"] = lastEventId;
  const response = await fetch(`${base}/v1/sandbox/listen`, { headers, signal: controller.signal });
  if (response.body === null || response.status !== 200)
    throw new Error(`listen answered ${String(response.status)}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  async function next(): Promise<StreamMessage> {
    for (;;) {
      const end = buffer.indexOf("\n\n");
      if (end >= 0) {
        const message = parseFrame(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (message !== undefined) return message;
        continue;
      }
      const chunk = await reader.read();
      if (chunk.done) throw new Error("stream ended");
      buffer += chunk.value;
    }
  }
  return {
    next,
    close: () => {
      controller.abort();
    },
  };
}
