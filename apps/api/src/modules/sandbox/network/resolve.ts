import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPublicAddress } from "./addresses.js";

/** Returns every address a host name resolves to, or none when it does not resolve. */
export type HostResolver = (host: string) => Promise<string[]>;

export const systemResolver: HostResolver = async (host) => {
  try {
    return (await lookup(host, { all: true, verbatim: true })).map((entry) => entry.address);
  } catch {
    return [];
  }
};

const localSuffixes = [".localhost", ".local", ".internal", ".home.arpa"];

function isLocalName(host: string): boolean {
  const name = host.toLowerCase().replace(/\.$/, "");
  return name === "localhost" || localSuffixes.some((suffix) => name.endsWith(suffix));
}

/**
 * Resolves a webhook URL to the addresses to connect to, all public, or undefined.
 * The caller connects to these exact addresses, so a later DNS answer cannot redirect it.
 */
export async function publicAddresses(
  url: string,
  resolve: HostResolver,
): Promise<string[] | undefined> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
  if (parsed.username !== "" || parsed.password !== "") return undefined;
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) !== 0) return isPublicAddress(host) ? [host] : undefined;
  if (isLocalName(host)) return undefined;
  const addresses = await resolve(host);
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) return undefined;
  return addresses;
}
