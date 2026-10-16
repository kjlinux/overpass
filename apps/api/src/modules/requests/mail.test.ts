import { describe, expect, it } from "vitest";
import { outcomeMail } from "./mail.js";

const link = "http://web.test/fr/dashboard";

describe("outcomeMail", () => {
  it("writes names with dollar signs as typed", () => {
    const mail = outcomeMail("a@b.co", "fr", { name: "Pay$'", accepted: true, reason: null, link });
    expect(mail.text).toContain("le service Pay$' rejoint");
  });

  it("gives the reason of a refusal, or says none was given", () => {
    const reason = "Documentation $& privée.";
    const refused = outcomeMail("a@b.co", "en", { name: "Pay", accepted: false, reason, link });
    expect(refused.text).toContain("Reason: Documentation $& privée.");
    const silent = outcomeMail("a@b.co", "en", {
      name: "Pay",
      accepted: false,
      reason: null,
      link,
    });
    expect(silent.text).toContain("Reason: no reason given.");
  });
});
