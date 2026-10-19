import { describe, expect, it } from "vitest";
import { parseArgs } from "./args.js";

const forward = ["--forward-to", "http://localhost:3000/webhook"];
const key = ["--key", "ovp_test_abc"];
const api = ["--api", "https://api.example.com"];

describe("parseArgs", () => {
  it("reads the listen command", () => {
    expect(parseArgs(["listen", ...forward, ...key, ...api], {})).toEqual({
      command: "listen",
      forwardTo: "http://localhost:3000/webhook",
      key: "ovp_test_abc",
      api: "https://api.example.com",
    });
  });

  it("falls back to the environment for the key and the API", () => {
    const env = { OVERPASS_KEY: "ovp_test_env", OVERPASS_API_URL: "https://api.env.example" };
    expect(parseArgs(["listen", ...forward], env)).toMatchObject({
      key: "ovp_test_env",
      api: "https://api.env.example",
    });
  });

  it("accepts the --flag=value form", () => {
    const parsed = parseArgs(
      ["listen", "--forward-to=http://127.0.0.1:8080/hooks", ...key, ...api],
      {},
    );
    expect(parsed).toMatchObject({ forwardTo: "http://127.0.0.1:8080/hooks" });
  });

  it.each([
    [["listen", ...key, ...api], "missing_forward"],
    [["listen", ...forward, ...api], "missing_key"],
    [["listen", ...forward, ...key], "missing_api"],
    [["listen", "--forward-to", "ftp://x", ...key, ...api], "invalid_forward"],
    [["listen", ...forward, "--key", "sk_live_x", ...api], "invalid_key"],
    [["listen", ...forward, ...key, "--api", "nope"], "invalid_api"],
    [["serve"], "unknown_command"],
  ])("reports %j as %s", (argv, error) => {
    expect(parseArgs(argv, {})).toEqual({ command: "error", error });
  });

  it("shows help without arguments or with --help", () => {
    expect(parseArgs([], {})).toEqual({ command: "help" });
    expect(parseArgs(["listen", "--help"], {})).toEqual({ command: "help" });
  });
});
