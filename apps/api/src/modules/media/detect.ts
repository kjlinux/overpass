export type ImageType = "image/png" | "image/jpeg" | "image/webp";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff]);

const startsWith = (bytes: Buffer, prefix: Buffer, at = 0): boolean =>
  bytes.length >= at + prefix.length && bytes.subarray(at, at + prefix.length).equals(prefix);

/** The image type read from the file signature; the declared content type is never trusted. */
export function detectImage(bytes: Buffer): ImageType | null {
  if (startsWith(bytes, png)) return "image/png";
  if (startsWith(bytes, jpeg)) return "image/jpeg";
  if (startsWith(bytes, Buffer.from("RIFF")) && startsWith(bytes, Buffer.from("WEBP"), 8)) {
    return "image/webp";
  }
  return null;
}
