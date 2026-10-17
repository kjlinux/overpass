import { isIP } from "node:net";

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;
  const [b0, b1] = parts;
  if (b0 === 10 || b0 === 127 || b0 === 0) return true;
  if (b0 === 172 && b1 !== undefined && b1 >= 16 && b1 <= 31) return true;
  if (b0 === 192 && b1 === 168) return true;
  if (b0 === 169 && b1 === 254) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  return (
    ip === "::1" ||
    ip === "::" ||
    ip.startsWith("fe80:") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

export function isPrivateOrLocalHost(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const raw = parsed.hostname.toLowerCase();
    const host = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
      return true;
    }
    const ipType = isIP(host);
    if (ipType === 4) return isPrivateIpv4(host);
    if (ipType === 6) return isPrivateIpv6(host);
    return false;
  } catch {
    return true;
  }
}
