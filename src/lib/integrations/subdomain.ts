import { requireEnv, shouldUseMockSubdomainProvider } from "@/lib/integrations/config";
import { withRetry } from "@/lib/reliability/retry";

export async function configureSubdomain(input: { subdomain: string; restaurantId: string }) {
  if (!shouldUseMockSubdomainProvider()) {
    const apiBase = requireEnv("SUBDOMAIN_PROVIDER_BASE_URL");
    const apiKey = requireEnv("SUBDOMAIN_PROVIDER_API_KEY");
    const rootDomain = requireEnv("SUBDOMAIN_ROOT_DOMAIN");

    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: async () => {
        const response = await fetch(`${apiBase}/domains/provision`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            subdomain: input.subdomain,
            root_domain: rootDomain,
            external_id: input.restaurantId
          })
        });

        if (!response.ok) {
          throw new Error(`Subdomain provider failed: ${response.status}`);
        }
      }
    });
  }

  return {
    configured: true,
    restaurantId: input.restaurantId,
    host: `${input.subdomain}.magroms.app`,
    ssl: "provisioned"
  };
}
