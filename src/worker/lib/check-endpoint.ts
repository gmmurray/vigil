import { isStatusCodeValid, parseExpectedStatusCodes } from './state-machine';

export interface CheckEndpointParams {
  url: string;
  method: string;
  headers?: Record<string, string> | null;
  body?: string | null;
  timeoutMs: number;
  expectedStatus: string;
}

export interface CheckEndpointResult {
  status: 'UP' | 'DOWN';
  statusCode: number | null;
  error: string | null;
  responseTimeMs: number;
}

export async function checkEndpoint(
  params: CheckEndpointParams,
  fetchFn: typeof fetch = fetch,
): Promise<CheckEndpointResult> {
  const start = Date.now();
  let status: 'UP' | 'DOWN' = 'DOWN';
  let statusCode: number | null = null;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs);

    const resp = await fetchFn(params.url, {
      method: params.method,
      headers: params.headers || undefined,
      body: params.body || undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    statusCode = resp.status;

    const validCodes = parseExpectedStatusCodes(params.expectedStatus);

    if (isStatusCodeValid(statusCode, validCodes)) {
      status = 'UP';
    } else {
      error = `Unexpected status code: ${statusCode}`;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      error = e.name === 'AbortError' ? 'Timeout' : e.message;
    } else {
      error = 'Network Error';
    }
  }

  const responseTimeMs = Date.now() - start;

  return {
    status,
    statusCode,
    error,
    responseTimeMs,
  };
}
