import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createSecureServer } from "node:http2";
import type { Http2SecureServer } from "node:http2";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

/** A throwaway self-signed certificate: browsers only speak HTTP/2 over TLS. */
function certificate(): { key: Buffer; cert: Buffer } {
  const dir = mkdtempSync(join(tmpdir(), "overpass-h2-"));
  try {
    const [key, cert] = [join(dir, "key.pem"), join(dir, "cert.pem")];
    const options = ["-subj", "/CN=127.0.0.1", "-days", "1", "-nodes"];
    const args = ["req", "-x509", "-newkey", "rsa:2048", "-keyout", key, "-out", cert];
    execFileSync("openssl", [...args, ...options], { stdio: "ignore" });
    return { key: readFileSync(key), cert: readFileSync(cert) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const isFile = (file: string): boolean => existsSync(file) && statSync(file).isFile();

/** Same lookup as deploy/Caddyfile.example: the file, then its index.html, then the SPA shell. */
export function resolveFile(root: string, path: string): string {
  const shell = join(root, "index.html");
  const clean = normalize(decodeURIComponent(path.split("?")[0] ?? "/")).replace(/^[/\\]+/, "");
  const candidates = [join(root, clean), join(root, clean, "index.html")];
  return candidates.find((file) => file.startsWith(root) && isFile(file)) ?? shell;
}

/** Serves a built site over HTTP/2 the way the production proxy does; the API answers 404. */
export function serveStatic(root: string, port: number): Promise<Http2SecureServer> {
  const server = createSecureServer(certificate(), (request, response) => {
    if (request.url.startsWith("/v1/")) {
      response.writeHead(404, { "content-type": "application/json" }).end("{}");
      return;
    }
    const file = resolveFile(root, request.url);
    const type = types[extname(file)] ?? "application/octet-stream";
    // The proxy compresses too, so the bytes on the simulated link match production.
    const gzip = /gzip/.test(String(request.headers["accept-encoding"]));
    const headers = { "content-type": type, ...(gzip ? { "content-encoding": "gzip" } : {}) };
    const body = readFileSync(file);
    response.writeHead(200, headers).end(gzip ? gzipSync(body) : body);
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => {
      resolve(server);
    }),
  );
}
