import { withRetry } from "@/lib/reliability/retry";

export async function sendOpsAlert(input: {
  title: string;
  severity: "info" | "warning" | "critical";
  details: Record<string, unknown>;
}) {
  const webhook = process.env.SLACK_ALERT_WEBHOOK_URL;
  if (!webhook) {
    return { sent: false, reason: "SLACK_ALERT_WEBHOOK_URL not configured" };
  }

  const color = input.severity === "critical" ? "#D92D20" : input.severity === "warning" ? "#F79009" : "#2E90FA";

  await withRetry({
    attempts: 3,
    baseDelayMs: 200,
    operation: async () => {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attachments: [
            {
              color,
              title: input.title,
              text: Object.entries(input.details)
                .map(([key, value]) => `*${key}*: ${String(value)}`)
                .join("\n")
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Slack alert failed: ${response.status}`);
      }
    }
  });

  return { sent: true };
}

