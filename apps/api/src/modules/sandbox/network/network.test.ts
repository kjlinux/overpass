import { describe, expect, it } from "vitest";
import { isPublicAddress } from "./addresses.js";
import { publicAddresses } from "./resolve.js";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fe80::1%eth0",
    "fc00::1",
    "fd12:3456::1",
    "::ffff:127.0.0.1",
    "::7f00:1",
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe",
    "64:ff9b::7f00:1",
    "2002:7f00:1::",
    "ff02::1",
    "not-an-ip",
  ])("refuses %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "accepts %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );
});

describe("publicAddresses", () => {
  const resolver = (answers: Record<string, string[]>) => (host: string) =>
    Promise.resolve(answers[host] ?? []);
  const dns = resolver({
    "ok.example": ["93.184.216.34"],
    "mixed.example": ["93.184.216.34", "10.0.0.1"],
  });

  it("returns the resolved public addresses to pin", async () => {
    expect(await publicAddresses("https://ok.example/hook", dns)).toEqual(["93.184.216.34"]);
  });

  it("refuses a name when any of its addresses is private", async () => {
    expect(await publicAddresses("https://mixed.example/hook", dns)).toBeUndefined();
  });

  it.each([
    "https://nowhere.example/hook",
    "https://localhost/x",
    "https://api.localhost/x",
    "https://printer.local/x",
    "http://[::1]:8080/x",
    "http://2130706433/x",
    "http://0x7f.1/x",
    "ftp://ok.example/x",
    "https://ok.example:22/x",
    "http://ok.example:6379/x",
    "https://user:pass@ok.example/x",
    "http://ok.example/x",
    "http://93.184.216.34/x",
    "not a url",
  ])("refuses %s", async (url) => {
    expect(await publicAddresses(url, dns)).toBeUndefined();
  });

  it.each(["https://ok.example/x", "https://ok.example:443/x", "https://ok.example:8443/x"])(
    "accepts the web port of %s",
    async (url) => {
      expect(await publicAddresses(url, dns)).toEqual(["93.184.216.34"]);
    },
  );

  it("accepts a public IP literal without asking the resolver", async () => {
    expect(await publicAddresses("https://93.184.216.34:8443/x", dns)).toEqual(["93.184.216.34"]);
  });
});
