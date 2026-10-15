import { describe, expect, it } from "vitest";
import { captureVars, fillStep, launchSteps } from "./steps.js";
import type { ExampleStep } from "./steps.js";

const token: ExampleStep = {
  id: "token",
  method: "POST",
  path: "/oauth/token",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials&client_id=overpass&client_secret=test",
  capture: { token: "access_token" },
  launch: true,
};
const request: ExampleStep = {
  id: "request",
  method: "POST",
  path: "/piz/v1/demandes-paiements",
  headers: { authorization: "Bearer {{token}}" },
  body: { txId: "{{fresh}}", montant: 1500, nested: { ref: "{{fresh}}" } },
  capture: { txId: "txId" },
  launch: true,
};
const read: ExampleStep = {
  id: "read",
  method: "GET",
  path: "/piz/v1/demandes-paiements/{{txId}}",
};

describe("fillStep", () => {
  it("keeps a form body raw with its own content type", () => {
    expect(fillStep(token, {})).toEqual({
      method: "POST",
      path: "/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      rawBody: "grant_type=client_credentials&client_id=overpass&client_secret=test",
    });
  });

  it("fills placeholders in headers and nested JSON, and sends JSON", () => {
    const filled = fillStep(request, { token: "tok", fresh: "ab12" });
    expect(filled.headers).toEqual({
      authorization: "Bearer tok",
      "content-type": "application/json",
    });
    expect(JSON.parse(filled.rawBody)).toEqual({
      txId: "ab12",
      montant: 1500,
      nested: { ref: "ab12" },
    });
  });

  it("fills the path and sends no body when the step has none", () => {
    expect(fillStep(read, { txId: "T 1" })).toMatchObject({
      path: "/piz/v1/demandes-paiements/T%201",
      rawBody: "",
    });
  });

  it("leaves an unknown placeholder visible rather than guessing", () => {
    expect(fillStep(read, {}).path).toBe("/piz/v1/demandes-paiements/{{txId}}");
  });
});

describe("captureVars", () => {
  it("captures string and number fields of the response", () => {
    expect(captureVars(token, { access_token: "tok", expires_in: 3600 })).toEqual({ token: "tok" });
    expect(captureVars({ ...read, capture: { amount: "montant" } }, { montant: 1500 })).toEqual({
      amount: "1500",
    });
  });

  it("ignores missing fields and bodies that are not objects", () => {
    expect(captureVars(request, {})).toEqual({});
    expect(captureVars(request, "text")).toEqual({});
    expect(captureVars(read, { txId: "x" })).toEqual({});
  });
});

describe("launchSteps", () => {
  it("keeps the steps marked for the launch button, in order", () => {
    expect(launchSteps([token, request, read]).map((step) => step.id)).toEqual([
      "token",
      "request",
    ]);
  });
});
