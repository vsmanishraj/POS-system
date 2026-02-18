import { requireEnv, shouldUseMockEmailProvider } from "@/lib/integrations/config";
import { withRetry } from "@/lib/reliability/retry";

export async function sendWelcomeEmail(input: {
  restaurantName: string;
  adminEmail: string;
  subdomain: string;
}) {
  if (!shouldUseMockEmailProvider()) {
    const provider = (process.env.EMAIL_PROVIDER ?? "RESEND").toUpperCase();
    const from = requireEnv("EMAIL_FROM");

    if (provider !== "RESEND") {
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
    }

    const apiKey = requireEnv("RESEND_API_KEY");

    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: async () => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            from,
            to: [input.adminEmail],
            subject: `Welcome to Magroms POS, ${input.restaurantName}`,
            html: `<p>Welcome to Magroms POS.</p><p>Login at https://${input.subdomain}.magroms.app/auth/login</p>`
          })
        });

        if (!response.ok) {
          throw new Error(`Email provider failed: ${response.status}`);
        }
      }
    });
  }

  return {
    delivered: true,
    to: input.adminEmail,
    subject: `Welcome to Magroms POS, ${input.restaurantName}`,
    dashboardUrl: `https://${input.subdomain}.magroms.app/auth/login`
  };
}

export async function sendStaffInviteEmail(input: {
  to: string;
  fullName: string;
  role: string;
  temporaryPassword: string;
  loginUrl: string;
}) {
  if (!shouldUseMockEmailProvider()) {
    const provider = (process.env.EMAIL_PROVIDER ?? "RESEND").toUpperCase();
    const from = requireEnv("EMAIL_FROM");

    if (provider !== "RESEND") {
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
    }

    const apiKey = requireEnv("RESEND_API_KEY");

    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: async () => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            from,
            to: [input.to],
            subject: `Your Magroms POS Staff Access (${input.role})`,
            html: `<p>Hello ${input.fullName}</p><p>Temporary password: ${input.temporaryPassword}</p><p>Login: ${input.loginUrl}</p>`
          })
        });

        if (!response.ok) {
          throw new Error(`Email provider failed: ${response.status}`);
        }
      }
    });
  }

  return {
    delivered: true,
    to: input.to,
    subject: `Your Magroms POS Staff Access (${input.role})`,
    preview: `Hello ${input.fullName}, use temporary password ${input.temporaryPassword} at ${input.loginUrl}`
  };
}
