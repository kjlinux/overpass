import { describe, expect, it } from "vitest";
import { createSseParser } from "./sse.js";

describe("createSseParser", () => {
  it("emits complete frames whatever the chunk boundaries", () => {
    const parser = createSseParser();
    const text = 'event: ready\ndata: {"a":1}\n\nid: 7\nevent: webhook\ndata: {"b":2}\n\n';
    const frames = [...text].flatMap((character) => parser.push(character));
    expect(frames).toEqual([
      { event: "ready", id: undefined, data: '{"a":1}' },
      { event: "webhook", id: "7", data: '{"b":2}' },
    ]);
  });

  it("skips comments and joins multi-line data", () => {
    const parser = createSseParser();
    expect(parser.push(": ping\n\ndata: one\ndata: two\n\n")).toEqual([
      { event: "message", id: undefined, data: "one\ntwo" },
    ]);
  });

  it("accepts CRLF line endings", () => {
    const parser = createSseParser();
    expect(parser.push("event: x\r\ndata: y\r\n\r\n")).toEqual([
      { event: "x", id: undefined, data: "y" },
    ]);
  });
});
