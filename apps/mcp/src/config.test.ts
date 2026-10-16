import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("defaults to a local API, English and a loopback listener", () => {
    expect(loadConfig({})).toEqual({
      apiUrl: "http://127.0.0.1:3000",
      language: "en",
      host: "127.0.0.1",
      port: 3100,
      token: undefined,
    });
  });

  it("reads every setting from the environment", () => {
    const config = loadConfig({
      OVERPASS_API_URL: "https://overpass.example/",
      OVERPASS_LANG: "fr",
      OVERPASS_TOKEN: "ovp_x",
      MCP_HOST: "0.0.0.0",
      MCP_PORT: "8080",
    });
    expect(config).toMatchObject({ language: "fr", port: 8080, token: "ovp_x" });
  });

  it("rejects an API address that is not http or https", () => {
    expect(() => loadConfig({ OVERPASS_API_URL: "file:///etc/passwd" })).toThrow();
  });
});
