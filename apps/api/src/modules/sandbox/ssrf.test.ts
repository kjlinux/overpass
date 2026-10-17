import { describe, expect, it } from "vitest";
import { isPrivateOrLocalHost } from "./ssrf.js";

describe("isPrivateOrLocalHost", () => {
  it("blocks localhost and loopback addresses", () => {
    expect(isPrivateOrLocalHost("http://localhost:3000/callback")).toBe(true);
    expect(isPrivateOrLocalHost("http://localhost/webhook")).toBe(true);
    expect(isPrivateOrLocalHost("http://127.0.0.1:8080")).toBe(true);
    expect(isPrivateOrLocalHost("http://127.0.1.1")).toBe(true);
    expect(isPrivateOrLocalHost("http://[::1]:3000")).toBe(true);
    expect(isPrivateOrLocalHost("http://0.0.0.0:4000")).toBe(true);
  });

  it("blocks private IPv4 ranges", () => {
    expect(isPrivateOrLocalHost("http://10.0.0.1/hook")).toBe(true);
    expect(isPrivateOrLocalHost("http://172.16.0.5/hook")).toBe(true);
    expect(isPrivateOrLocalHost("http://172.31.255.255/hook")).toBe(true);
    expect(isPrivateOrLocalHost("http://192.168.1.1/hook")).toBe(true);
    expect(isPrivateOrLocalHost("http://169.254.169.254/latest/meta-data/")).toBe(true);
  });

  it("blocks local hostnames", () => {
    expect(isPrivateOrLocalHost("http://my-server.local/hook")).toBe(true);
    expect(isPrivateOrLocalHost("http://internal.service.internal/hook")).toBe(true);
  });

  it("accepts public HTTPS and HTTP addresses", () => {
    expect(isPrivateOrLocalHost("https://example.com/webhook")).toBe(false);
    expect(isPrivateOrLocalHost("https://api.overpass.africa/hook")).toBe(false);
    expect(isPrivateOrLocalHost("http://8.8.8.8:8080/hook")).toBe(false);
  });
});
