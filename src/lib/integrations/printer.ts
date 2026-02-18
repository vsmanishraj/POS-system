import { requireEnv, shouldUseMockPrinterProvider } from "@/lib/integrations/config";
import { withRetry } from "@/lib/reliability/retry";
export type PrinterType = "USB" | "BLUETOOTH" | "NETWORK";

export async function printDocument(input: {
  restaurantId: string;
  printerType: PrinterType;
  documentType: "KOT" | "RECEIPT" | "PICKUP_LABEL";
  payload: Record<string, unknown>;
}) {
  if (!shouldUseMockPrinterProvider()) {
    const baseUrl = requireEnv("PRINTER_GATEWAY_BASE_URL");
    const apiKey = requireEnv("PRINTER_GATEWAY_API_KEY");

    return withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: async () => {
        const response = await fetch(`${baseUrl}/print`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            restaurant_id: input.restaurantId,
            printer_type: input.printerType,
            document_type: input.documentType,
            payload: input.payload
          })
        });

        if (!response.ok) {
          throw new Error(`Printer gateway failed: ${response.status}`);
        }

        const body = (await response.json()) as { job_id?: string; queued?: boolean };
        return {
          queued: body.queued ?? true,
          jobId: body.job_id ?? crypto.randomUUID(),
          ...input
        };
      }
    });
  }

  return {
    queued: true,
    jobId: crypto.randomUUID(),
    ...input
  };
}
