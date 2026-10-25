import { describe, expect, it } from "vitest";
import { parseSections } from "./sections.js";

describe("parseSections", () => {
  it("splits the lead text from the blocks that follow it", () => {
    const text = [
      "Le webhook n'arrive jamais.",
      "",
      "@@ author=serge-tech at=2026-10-24T09:12 useful=yao-dev,awa-kone accepted @@",
      "Vérifiez l'URL publique.",
      "",
      "@@ author=yao-dev at=2026-10-24T10:00 @@",
      "Merci, ça marche !",
    ].join("\n");
    expect(parseSections(text)).toEqual({
      body: "Le webhook n'arrive jamais.",
      blocks: [
        {
          author: "serge-tech",
          at: "2026-10-24T09:12",
          useful: "yao-dev,awa-kone",
          accepted: "true",
          content: "Vérifiez l'URL publique.",
        },
        { author: "yao-dev", at: "2026-10-24T10:00", content: "Merci, ça marche !" },
      ],
    });
  });

  it("keeps a body without blocks whole", () => {
    expect(parseSections("Corps.\n\nSuite.")).toEqual({ body: "Corps.\n\nSuite.", blocks: [] });
  });

  it("refuses a block header that names a field twice", () => {
    expect(() => parseSections("Corps.\n@@ author=a author=b @@\nTexte")).toThrow(/author/);
  });
});
