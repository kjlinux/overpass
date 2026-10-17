import type { SandboxEventOutput, SandboxKeyOutput, SandboxScenario } from "@overpass/shared";

export type ProviderOption = {
  id: "wave" | "cinetpay";
  name: string;
  samplePath: string;
  defaultCurrency: string;
  defaultAmount: string;
  signatureHeader: string;
};

export const providers: ProviderOption[] = [
  {
    id: "wave",
    name: "Wave",
    samplePath: "/v1/checkout/sessions",
    defaultCurrency: "XOF",
    defaultAmount: "1000",
    signatureHeader: "wave-signature",
  },
  {
    id: "cinetpay",
    name: "CinetPay",
    samplePath: "/v1/payment",
    defaultCurrency: "XOF",
    defaultAmount: "2500",
    signatureHeader: "x-token",
  },
];

export type SimulationResult = {
  eventId?: string | undefined;
  outcome: {
    response: {
      status: number;
      headers: Record<string, string>;
      body?: unknown;
    };
    webhooks: Array<{
      delayMs: number;
      headers: Record<string, string>;
      payload: unknown;
      duplicateOf?: number | undefined;
      delivered?: boolean | undefined;
      deliveryStatus?: number | undefined;
    }>;
  };
};

export type SandboxState = {
  provider: "wave" | "cinetpay";
  scenario: SandboxScenario;
  amount: string;
  currency: string;
  webhookUrl: string;
  secret: string;
  keyRecord: SandboxKeyOutput | null;
  loading: boolean;
  error: string | null;
  result: SimulationResult | null;
  events: readonly SandboxEventOutput[];
};
