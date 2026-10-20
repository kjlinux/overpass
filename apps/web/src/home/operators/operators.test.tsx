import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { OperatorList } from "./Operators";
import { operatorsView, parseOperators } from "./view";

const service = (slug: string, name: string, simulated: boolean, countries: string[]) => ({
  slug,
  name,
  category: "payment",
  countries,
  coverage: [],
  simulated,
});

const body = [
  service("cinetpay", "CinetPay", false, ["CI"]),
  service("paydunya", "PayDunya", true, ["SN", "CI"]),
  service("wave", "Wave", true, ["SN"]),
];

describe("parseOperators", () => {
  it("keeps only the simulated services of GET /v1/services, in the order of the API", () => {
    expect(parseOperators(body)).toEqual([
      { slug: "paydunya", name: "PayDunya", category: "payment", countries: 2 },
      { slug: "wave", name: "Wave", category: "payment", countries: 1 },
    ]);
  });

  it("rejects an off-contract body", () => {
    expect(parseOperators({ items: body })).toBeNull();
    expect(parseOperators([{ slug: "wave" }])).toBeNull();
    expect(parseOperators(null)).toBeNull();
  });
});

describe("operatorsView", () => {
  it("keeps the skeleton while the list loads", () => {
    expect(operatorsView({ status: "loading" })).toEqual({ kind: "loading" });
  });

  it("hides the list on failure or when no operator is simulated", () => {
    expect(operatorsView({ status: "error" })).toEqual({ kind: "hidden" });
    expect(operatorsView({ status: "ready", operators: [] })).toEqual({ kind: "hidden" });
  });

  it("shows the operators the database marks as simulated", () => {
    const operators = parseOperators(body) ?? [];
    expect(operatorsView({ status: "ready", operators })).toEqual({ kind: "shown", operators });
  });
});

describe("OperatorList", () => {
  const operators = parseOperators(body) ?? [];

  it("prints names as data and a translated kind from the category and country count", async () => {
    await setupTestI18n("fr");
    const html = render(<OperatorList operators={operators} />);
    expect(html).toContain(">PayDunya<");
    expect(html).toContain(">Wave<");
    expect(html).not.toContain("CinetPay");
    expect(html).toContain("paiement, 2 pays<");
    expect(html).toContain("paiement, 1 pays<");
  });

  it("agrees the country count in English", async () => {
    await setupTestI18n("en");
    const html = render(<OperatorList operators={operators} />);
    expect(html).toContain("payment, 2 countries<");
    expect(html).toContain("payment, 1 country<");
  });
});
