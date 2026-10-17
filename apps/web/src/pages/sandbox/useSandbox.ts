import type { SandboxEventOutput, SandboxKeyOutput, SandboxScenario } from "@overpass/shared";
import { useCallback, useState } from "preact/hooks";
import { apiRequest } from "../../session/api";
import { providers } from "./types";
import type { ProviderOption, SimulationResult } from "./types";

const defaultProvider: ProviderOption = providers[0] ?? {
  id: "wave",
  name: "Wave",
  samplePath: "/v1/checkout/sessions",
  defaultCurrency: "XOF",
  defaultAmount: "1000",
  signatureHeader: "wave-signature",
};

function buildSimulationBody(provider: ProviderOption, amount: string, currency: string) {
  if (provider.id === "cinetpay") {
    return {
      apikey: "cinetpay_test_key",
      site_id: "site_test_123",
      transaction_id: `tx_${String(Date.now())}`,
      amount,
      currency,
      description: "Test simulation Overpass",
    };
  }
  return {
    amount,
    currency,
    error_url: "https://example.com/cancel",
    success_url: "https://example.com/success",
  };
}

function useSandboxFormState(initial: "wave" | "cinetpay") {
  const [providerId, setProviderId] = useState<"wave" | "cinetpay">(initial);
  const [scenario, setScenario] = useState<SandboxScenario>("payment_success");
  const [amount, setAmount] = useState("1000");
  const [currency, setCurrency] = useState("XOF");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secret, setSecret] = useState("");

  const provider = providers.find((p) => p.id === providerId) ?? defaultProvider;
  return {
    provider,
    setProviderId,
    scenario,
    setScenario,
    amount,
    setAmount,
    currency,
    setCurrency,
    webhookUrl,
    setWebhookUrl,
    secret,
    setSecret,
  };
}

type FormState = ReturnType<typeof useSandboxFormState>;

async function sendSimulationRequest(form: FormState, keyRecord: SandboxKeyOutput | null) {
  const body = buildSimulationBody(form.provider, form.amount, form.currency);
  const headers = keyRecord !== null ? { "x-sandbox-key": keyRecord.key } : undefined;
  return apiRequest<SimulationResult>(
    "POST",
    `/v1/sandbox/${form.provider.id}${form.provider.samplePath}`,
    {
      scenario: form.scenario,
      method: "POST",
      path: form.provider.samplePath,
      body,
      ...(form.webhookUrl.trim().length > 0 ? { webhookUrl: form.webhookUrl.trim() } : {}),
      ...(form.secret.trim().length > 0 ? { secret: form.secret.trim() } : {}),
    },
    headers,
  );
}

function useKeyManager(providerId: string, setError: (e: string | null) => void) {
  const [keyRecord, setKeyRecord] = useState<SandboxKeyOutput | null>(null);

  const generateKey = useCallback(async () => {
    setError(null);
    const res = await apiRequest<SandboxKeyOutput>("POST", "/v1/sandbox/keys", {
      provider: providerId,
      expiresHours: 48,
    });
    if (res.data !== null) {
      setKeyRecord(res.data);
    } else {
      setError(res.error.code);
    }
  }, [providerId, setError]);

  return { keyRecord, setKeyRecord, generateKey };
}

function useEventLoader() {
  const [events, setEvents] = useState<readonly SandboxEventOutput[]>([]);

  const loadEvents = useCallback(async (key: string) => {
    const res = await apiRequest<SandboxEventOutput[]>("GET", "/v1/sandbox/events", undefined, {
      "x-sandbox-key": key,
    });
    if (res.data !== null) setEvents(res.data);
  }, []);

  return { events, loadEvents };
}

function useSimulationRunner(form: FormState) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const keys = useKeyManager(form.provider.id, setError);
  const eventLog = useEventLoader();

  const simulate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const simRes = await sendSimulationRequest(form, keys.keyRecord);
    setLoading(false);
    if (simRes.data !== null) {
      setResult(simRes.data);
      if (keys.keyRecord !== null) {
        keys.setKeyRecord({
          ...keys.keyRecord,
          quotaRemaining: Math.max(0, keys.keyRecord.quotaRemaining - 1),
        });
        void eventLog.loadEvents(keys.keyRecord.key);
      }
    } else {
      setError(simRes.error.code);
    }
  }, [form, keys, eventLog]);

  return {
    keyRecord: keys.keyRecord,
    loading,
    error,
    clearError: () => {
      setError(null);
    },
    result,
    events: eventLog.events,
    generateKey: keys.generateKey,
    simulate,
  };
}

export function useSandbox(initialProvider: "wave" | "cinetpay" = "wave") {
  const form = useSandboxFormState(initialProvider);
  const runner = useSimulationRunner(form);
  return { ...form, ...runner };
}
