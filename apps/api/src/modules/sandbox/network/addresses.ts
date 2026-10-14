import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
const v4Ranges: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];
const v6Ranges: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
];
for (const [network, prefix] of v4Ranges) blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of v6Ranges) blocked.addSubnet(network, prefix, "ipv6");

/** IPv4-mapped IPv6 addresses carry an IPv4 address that must pass the IPv4 rules. */
function embeddedV4(address: string): string | undefined {
  const match = /^::ffff:(?:0:)?(.+)$/i.exec(address);
  if (match?.[1] === undefined) return undefined;
  if (isIP(match[1]) === 4) return match[1];
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(match[1]);
  if (hex?.[1] === undefined || hex[2] === undefined) return undefined;
  const value = (Number.parseInt(hex[1], 16) << 16) | Number.parseInt(hex[2], 16);
  return [24, 16, 8, 0].map((shift) => ((value >>> shift) & 255).toString()).join(".");
}

/** True only for a globally routable unicast address. */
export function isPublicAddress(address: string): boolean {
  const bare = address.split("%")[0] ?? "";
  const version = isIP(bare);
  if (version === 4) return !blocked.check(bare, "ipv4");
  if (version !== 6) return false;
  const mapped = embeddedV4(bare);
  if (mapped !== undefined) return isPublicAddress(mapped);
  return !blocked.check(bare, "ipv6");
}
