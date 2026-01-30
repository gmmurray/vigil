import type { MonitorStatus } from '../types';

export interface StateCounters {
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface StateTransitionResult {
  newStatus: MonitorStatus;
  counters: StateCounters;
}

/**
 * Pure function to calculate the next monitor state based on check result.
 *
 * State transitions:
 * - UP → DEGRADED (first failure)
 * - DEGRADED → DOWN (threshold consecutive failures)
 * - DOWN → RECOVERING (first success)
 * - RECOVERING → UP (threshold consecutive successes)
 * - DEGRADED → UP (single success)
 */
export function calculateNextState(
  currentStatus: MonitorStatus,
  checkPassed: boolean,
  counters: StateCounters,
  threshold = 3,
): StateTransitionResult {
  let { consecutiveFailures, consecutiveSuccesses } = counters;
  let newStatus: MonitorStatus = currentStatus;

  if (!checkPassed) {
    // Check failed
    consecutiveSuccesses = 0;
    consecutiveFailures++;

    if (currentStatus === 'UP' || currentStatus === 'RECOVERING') {
      newStatus = 'DEGRADED';
    } else if (
      currentStatus === 'DEGRADED' &&
      consecutiveFailures >= threshold
    ) {
      newStatus = 'DOWN';
    }
  } else {
    // Check passed
    consecutiveFailures = 0;
    consecutiveSuccesses++;

    if (currentStatus === 'DOWN') {
      newStatus = 'RECOVERING';
    } else if (
      currentStatus === 'RECOVERING' &&
      consecutiveSuccesses >= threshold
    ) {
      newStatus = 'UP';
    } else if (currentStatus === 'DEGRADED') {
      newStatus = 'UP';
    }
  }

  return {
    newStatus,
    counters: {
      consecutiveFailures,
      consecutiveSuccesses,
    },
  };
}

/**
 * Determines if a notification should be sent based on status transition.
 *
 * Notifications are sent when:
 * - Transitioning to DOWN (outage detected)
 * - Transitioning to UP from DOWN or RECOVERING (outage resolved)
 *
 * Notifications are NOT sent when:
 * - Status unchanged (no transition occurred)
 * - Transitioning from DEGRADED to UP (minor recovery, not critical)
 */
export function shouldNotify(
  prevStatus: MonitorStatus,
  newStatus: MonitorStatus,
): boolean {
  // No notification if status didn't change
  if (prevStatus === newStatus) {
    return false;
  }

  if (newStatus === 'DOWN') {
    return true;
  }

  if (newStatus === 'UP' && prevStatus !== 'DEGRADED') {
    return true;
  }

  return false;
}

/**
 * Parses a comma-separated string of expected HTTP status codes.
 * Returns an array of valid status code numbers.
 *
 * @example
 * parseExpectedStatusCodes("200") // [200]
 * parseExpectedStatusCodes("200,201,204") // [200, 201, 204]
 * parseExpectedStatusCodes("200, 201, 204") // [200, 201, 204] (handles spaces)
 * parseExpectedStatusCodes("200,invalid,201") // [200, 201] (filters invalid)
 */
export function parseExpectedStatusCodes(expected: string): number[] {
  return expected
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !Number.isNaN(n) && n >= 100 && n < 600);
}

/**
 * Checks if a response status code matches any of the expected codes.
 */
export function isStatusCodeValid(
  statusCode: number | null,
  expectedCodes: number[],
): boolean {
  if (statusCode === null) {
    return false;
  }
  return expectedCodes.includes(statusCode);
}
