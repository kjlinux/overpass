import { describe, expect, it } from "vitest";
import { checkImage, imageMarkdown, insertAt, mediaIdOf } from "./images";

describe("checkImage", () => {
  it("accepts PNG, JPEG and WebP up to two megabytes", () => {
    expect(checkImage({ type: "image/png", size: 1024 })).toBeNull();
    expect(checkImage({ type: "image/webp", size: 2 * 1024 * 1024 })).toBeNull();
  });

  it("names what is wrong with any other file", () => {
    expect(checkImage({ type: "image/svg+xml", size: 10 })).toBe("image_invalid");
    expect(checkImage({ type: "image/gif", size: 10 })).toBe("image_invalid");
    expect(checkImage({ type: "image/jpeg", size: 2 * 1024 * 1024 + 1 })).toBe("image_too_large");
  });
});

const backslash = String.fromCharCode(92);
const paragraph = String.fromCharCode(10).repeat(2);

describe("imageMarkdown", () => {
  it("writes the image on its own paragraph, brackets in the text escaped", () => {
    expect(imageMarkdown("Le [tableau] de bord", "/v1/media/abc")).toBe(
      `${paragraph}![Le ${backslash}[tableau${backslash}] de bord](/v1/media/abc)${paragraph}`,
    );
  });
});

describe("insertAt", () => {
  it("inserts at the cursor, or at the end when there is none", () => {
    expect(insertAt("abcd", 2, "X")).toEqual({ text: "abXcd", cursor: 3 });
    expect(insertAt("abcd", null, "X")).toEqual({ text: "abcdX", cursor: 5 });
  });
});

describe("mediaIdOf", () => {
  it("reads the id from an Overpass media address", () => {
    const id = "7c7c5d0e-4a8f-4d6a-9b0e-2f1c9d3a1b11";
    expect(mediaIdOf(`/v1/media/${id}`)).toBe(id);
    expect(mediaIdOf("")).toBeNull();
    expect(mediaIdOf("https://example.com/x.png")).toBeNull();
  });
});
