import { describe, expect, it } from "vitest";
import { detectImage } from "./detect.js";
import { fakePng, sampleJpeg, samplePng, sampleWebp } from "../../testing-media.js";

describe("detectImage", () => {
  it("names PNG, JPEG and WebP from their first bytes", () => {
    expect(detectImage(samplePng)).toBe("image/png");
    expect(detectImage(sampleJpeg)).toBe("image/jpeg");
    expect(detectImage(sampleWebp)).toBe("image/webp");
  });

  it("refuses a file whose bytes are not an image, whatever its declared type", () => {
    expect(detectImage(fakePng)).toBeNull();
    expect(detectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(detectImage(Buffer.alloc(0))).toBeNull();
  });
});
