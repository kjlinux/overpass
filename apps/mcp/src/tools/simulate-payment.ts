import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OverpassApiClient } from "../client.js";

const simulateSchema = {
  provider: z.enum(["wave", "cinetpay", "pispi", "paydunya"]).describe("Payment provider"),
  scenario: z
    .enum([
      "payment_success",
      "insufficient_funds",
      "operator_timeout",
      "duplicate_webhook",
      "delayed_webhook",
    ])
    .describe("Simulation scenario to replay"),
  amount: z.string().optional().describe("Amount to charge, defaults to standard tier"),
  currency: z.string().optional().describe("Currency code, defaults to XOF"),
};

export function registerSimulatePaymentTool(server: McpServer, client: OverpassApiClient): void {
  server.registerTool(
    "simulate_payment",
    {
      ["description"]:
        "Simulate mobile money or bank instant transfer payment and inspect real webhook outcomes",
      inputSchema: simulateSchema,
    },
    async (params) => {
      const outcome = await client.simulatePayment(params);
      return {
        content: [{ type: "text", text: JSON.stringify(outcome, null, 2) }],
      };
    },
  );
}
