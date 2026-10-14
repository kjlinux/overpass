export type SseFrame = { event: string; id: string | undefined; data: string };

function parseFrame(block: string): SseFrame | undefined {
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "data") data.push(value);
  }
  return data.length === 0 ? undefined : { event, id, data: data.join("\n") };
}

/** Incremental Server-Sent Events parser: feed it chunks, get back the frames they complete. */
export function createSseParser() {
  let buffer = "";
  return {
    push(chunk: string): SseFrame[] {
      buffer = (buffer + chunk).replace(/\r\n/g, "\n");
      const frames: SseFrame[] = [];
      for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
        const frame = parseFrame(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (frame !== undefined) frames.push(frame);
      }
      return frames;
    },
  };
}
