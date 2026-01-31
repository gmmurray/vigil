export interface WebhookDeliveryResult {
  success: boolean;
  error: string | null;
  attempts: number;
}

export interface WebhookConfig {
  url: string;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * Calculates exponential backoff delay for retry attempts.
 * Delay = 2^(attempt-1) * 1000ms
 * attempt 1 -> 1000ms, attempt 2 -> 2000ms, attempt 3 -> 4000ms
 */
export function calculateBackoffDelay(attempt: number): number {
  return 2 ** (attempt - 1) * 1000;
}

/**
 * Delivers a webhook payload with retry logic and timeout.
 * Uses exponential backoff between retry attempts.
 */
export async function deliverWebhookWithRetry(
  config: WebhookConfig,
  payload: object,
  fetchFn: typeof fetch = fetch,
): Promise<WebhookDeliveryResult> {
  let lastError: string | null = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    attempts = attempt;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetchFn(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, error: null, attempts };
      }

      lastError = `HTTP ${response.status}`;
    } catch (err) {
      if (err instanceof Error) {
        lastError = err.name === 'AbortError' ? 'Timeout' : err.message;
      } else {
        lastError = 'Unknown error';
      }
    }

    if (attempt < config.maxRetries) {
      const delay = calculateBackoffDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: lastError, attempts };
}
