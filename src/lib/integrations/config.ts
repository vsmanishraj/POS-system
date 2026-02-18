function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export function shouldUseMockPreorderProvider() {
  return parseBoolean(process.env.USE_MOCK_PREORDER_PROVIDER, true);
}

export function shouldUseMockCrmProvider() {
  return parseBoolean(process.env.USE_MOCK_CRM_PROVIDER, true);
}

export function shouldUseMockPrinterProvider() {
  return parseBoolean(process.env.USE_MOCK_PRINTER_PROVIDER, true);
}

export function shouldUseMockEmailProvider() {
  return parseBoolean(process.env.USE_MOCK_EMAIL_PROVIDER, true);
}

export function shouldUseMockSubdomainProvider() {
  return parseBoolean(process.env.USE_MOCK_SUBDOMAIN_PROVIDER, true);
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when mock mode is disabled`);
  }
  return value;
}
