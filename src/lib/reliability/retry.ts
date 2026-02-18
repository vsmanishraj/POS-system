export async function withRetry<T>(input: {
  operation: () => Promise<T>;
  attempts?: number;
  baseDelayMs?: number;
}): Promise<T> {
  const attempts = Math.max(1, input.attempts ?? 3);
  const baseDelay = Math.max(1, input.baseDelayMs ?? 150);

  let lastError: unknown;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await input.operation();
    } catch (error) {
      lastError = error;
      if (index === attempts - 1) break;
      const delay = baseDelay * (index + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
