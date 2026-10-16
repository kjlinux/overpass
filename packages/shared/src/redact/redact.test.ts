import { describe, expect, it } from "vitest";
import { redactionMask, redactSecrets } from "../index.js";

const mask = redactionMask;

/** Secrets in the formats of each simulated provider, as members paste them by mistake. */
const providerSamples = {
  wave: {
    secret: "wave_sn_prod_YhUNAUh7SY8w2A4gBLGTEVR3RkQhWaWZ_pAB0X0ijE2u9aq2vbV0yk1ATlSuMcpMr8sB",
    pasted: (secret: string) =>
      `curl -X POST https://api.wave.com/v1/checkout/sessions \\\n  -H "Authorization: Bearer ${secret}" \\\n  -H "Content-Type: application/json"`,
  },
  pispiJwt: {
    secret:
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYXJjaGFuZC1jaSJ9.c2lnbmF0dXJlLWR1LWpldG9u",
    pasted: (secret: string) => `GET /demandes-paiements\nAuthorization: Bearer ${secret}`,
  },
  pispiClientSecret: {
    secret: "Zx81kLq0pPq9sT2v",
    pasted: (secret: string) =>
      `grant_type=client_credentials&client_id=marchand-ci&client_secret=${secret}&scope=demande_paiement.write`,
  },
  paydunyaMaster: {
    secret: "wQzk9ZwR-Qq9m-0hD0-zpud-je5coGC3FHKW",
    pasted: (secret: string) => `PAYDUNYA-MASTER-KEY: ${secret}\nContent-Type: application/json`,
  },
  paydunyaPrivate: {
    secret: "test_private_rMIdJM3PLLhLjyArx9tF3VURAF5",
    pasted: (secret: string) => `PAYDUNYA-PRIVATE-KEY: ${secret}`,
  },
  paydunyaToken: {
    secret: "IivOiOxGJuWhc5znlIiK",
    pasted: (secret: string) => `"PAYDUNYA-TOKEN": "${secret}",`,
  },
  paydunyaPhp: {
    secret: "wQzk9ZwR-Qq9m-0hD0-zpud-je5coGC3FHKW",
    pasted: (secret: string) => `\\Paydunya\\Setup::setMasterKey("${secret}");`,
  },
  overpassSandbox: {
    secret: "ovp_test_Qm9uam91ci1sZXMtZGV2cy1kdS1zdWQ",
    pasted: (secret: string) => `Erreur 401 avec la clé ${secret} : clé révoquée`,
  },
};

describe("redactSecrets on real samples of each simulated provider", () => {
  it.each(Object.entries(providerSamples))("hides the %s secret", (_name, sample) => {
    const { text, found } = redactSecrets(sample.pasted(sample.secret));
    expect(text).not.toContain(sample.secret);
    expect(text).toContain(mask);
    expect(found).toBeGreaterThanOrEqual(1);
  });

  it("keeps the rest of the snippet readable", () => {
    const { text } = redactSecrets(providerSamples.wave.pasted(providerSamples.wave.secret));
    expect(text).toContain("https://api.wave.com/v1/checkout/sessions");
    expect(text).toContain('-H "Content-Type: application/json"');
    expect(text).toContain("Authorization: Bearer ");
  });
});

describe("redactSecrets on generic secrets", () => {
  it.each([
    ["an .env file", "WAVE_API_KEY=wave_ci_prod_abcdefghijklmnop1234", "wave_ci_prod_"],
    ["a JSON password", '{ "password": "Hunter2!" }', "Hunter2!"],
    ["a YAML secret", "client_secret: s3cr3t-value", "s3cr3t-value"],
    ["a basic auth header", "Authorization: Basic YWRtaW46cGFzc3dvcmQxMjM=", "YWRtaW46"],
    ["credentials in a URL", "postgres://overpass:Pa55word@db.local/app", "Pa55word"],
    ["a stray JWT", "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl", "eyJhbGciOi"],
    ["a JS assignment", "const apiKey = 'live_secret_51HcQZ2aBcDeFgHiJ';", "51HcQZ2a"],
  ])("hides %s", (_name, input, secret) => {
    expect(redactSecrets(input).text).not.toContain(secret);
  });

  it("hides the body of a private key block", () => {
    const pem =
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";
    const { text } = redactSecrets(pem);
    expect(text).not.toContain("MIIEvQIBADANBgkqhkiG9w0BAQEFAASC");
    expect(text).toContain("-----BEGIN PRIVATE KEY-----");
  });

  it("counts every secret found", () => {
    const sample = providerSamples.paydunyaMaster;
    const both = `${sample.pasted(sample.secret)}\nPAYDUNYA-TOKEN: IivOiOxGJuWhc5znlIiK`;
    expect(redactSecrets(both).found).toBe(2);
  });
});

describe("redactSecrets leaves code without secrets untouched", () => {
  it.each([
    "Authorization: `Bearer ${process.env.WAVE_API_KEY}`",
    "const apiKey = process.env.WAVE_API_KEY;",
    "$token = env('PAYDUNYA_TOKEN');",
    'token_type: "Bearer"',
    '{ "amount": 1000, "currency": "XOF" }',
    "Le token expire au bout d'une heure, et le webhook arrive deux fois.",
    "expires_in: 3600",
    'tokenUrl: "https://api.pispi.example/oauth/token"',
  ])("keeps %s", (input) => {
    expect(redactSecrets(input)).toEqual({ text: input, found: 0 });
  });

  it("is idempotent", () => {
    const once = redactSecrets(providerSamples.wave.pasted(providerSamples.wave.secret)).text;
    expect(redactSecrets(once)).toEqual({ text: once, found: 0 });
  });
});
