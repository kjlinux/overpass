import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { SandboxForm, SandboxHistory, SandboxKeyCard, SandboxResults, providers } from "./index";
import fr from "./locales/fr.json";
import type { ProviderOption, SimulationResult } from "./types";

const waveProvider = providers[0] as ProviderOption;

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/sandbox", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

describe("SandboxKeyCard", () => {
  it("renders anonymous notice when no key is set", () => {
    const html = page(<SandboxKeyCard keyRecord={null} loading={false} onGenerate={vi.fn()} />);
    expect(html).toContain(fr.apiKey.anonymousNotice);
    expect(html).toContain(fr.apiKey.generate);
  });

  it("renders active key details and quota bar", () => {
    const key = {
      id: "00000000-0000-4000-8000-000000000001",
      key: "sbk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      provider: "wave",
      quotaRemaining: 95,
      expiresAt: "2026-10-20T12:00:00Z",
    };
    const html = page(<SandboxKeyCard keyRecord={key} loading={false} onGenerate={vi.fn()} />);
    expect(html).toContain(key.key);
    expect(html).toContain("95");
  });
});

describe("SandboxForm", () => {
  it("renders providers and all 5 scenarios", () => {
    const html = page(
      <SandboxForm
        provider={waveProvider}
        scenario="payment_success"
        amount="1000"
        currency="XOF"
        webhookUrl=""
        secret=""
        loading={false}
        onProviderChange={vi.fn()}
        onScenarioChange={vi.fn()}
        onAmountChange={vi.fn()}
        onCurrencyChange={vi.fn()}
        onWebhookUrlChange={vi.fn()}
        onSecretChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(html).toContain("Wave");
    expect(html).toContain("CinetPay");
    expect(html).toContain("PI-SPI (BCEAO)");
    expect(html).toContain("PayDunya");

    expect(html).toContain(fr.scenarios.payment_success);
    expect(html).toContain(fr.scenarios.insufficient_funds);
    expect(html).toContain(fr.scenarios.operator_timeout);
    expect(html).toContain(fr.scenarios.duplicate_webhook);
    expect(html).toContain(fr.scenarios.delayed_webhook);
  });
});

describe("SandboxResults", () => {
  it("displays simulated outcome with status code and payload", () => {
    const mockResult: SimulationResult = {
      outcome: {
        response: {
          status: 200,
          headers: { "content-type": "application/json" },
          body: { id: "wave_sess_test", status: "complete" },
        },
        webhooks: [
          {
            delayMs: 1500,
            headers: { "wave-signature": "test_sig_abc" },
            payload: { type: "checkout.session.completed" },
          },
        ],
      },
    };

    const html = page(<SandboxResults provider={waveProvider} result={mockResult} />);
    expect(html).toContain("HTTP 200");
    expect(html).toContain("wave_sess_test");
  });
});

describe("SandboxHistory", () => {
  it("displays message when history is empty", () => {
    const html = page(<SandboxHistory events={[]} />);
    expect(html).toContain(fr.history.empty);
  });

  it("lists previous events", () => {
    const mockEvents = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        scenario: "payment_success" as const,
        requestMethod: "POST",
        requestPath: "/v1/checkout/sessions",
        requestHeaders: {},
        responseStatus: 200,
        responseHeaders: {},
        webhooks: [],
        createdAt: "2026-10-17T14:00:00Z",
      },
    ];
    const html = page(<SandboxHistory events={mockEvents} />);
    expect(html).toContain(fr.scenarios.payment_success);
    expect(html).toContain("200");
    expect(html).toContain("17");
    expect(html).toContain("oct");
  });
});
