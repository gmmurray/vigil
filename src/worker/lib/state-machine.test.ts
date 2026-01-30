import { describe, expect, it } from 'vitest';
import type { MonitorStatus } from '../types';
import {
  calculateNextState,
  isStatusCodeValid,
  parseExpectedStatusCodes,
  type StateCounters,
  shouldNotify,
} from './state-machine';

describe('calculateNextState', () => {
  const DEFAULT_THRESHOLD = 3;
  const zeroCounters: StateCounters = {
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
  };

  describe('when check fails', () => {
    it('transitions from UP to DEGRADED on first failure', () => {
      const result = calculateNextState(
        'UP',
        false,
        zeroCounters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('DEGRADED');
      expect(result.counters.consecutiveFailures).toBe(1);
      expect(result.counters.consecutiveSuccesses).toBe(0);
    });

    it('transitions from RECOVERING to DEGRADED on failure', () => {
      const result = calculateNextState(
        'RECOVERING',
        false,
        zeroCounters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('DEGRADED');
      expect(result.counters.consecutiveFailures).toBe(1);
    });

    it('stays DEGRADED until threshold failures', () => {
      const counters: StateCounters = {
        consecutiveFailures: 1,
        consecutiveSuccesses: 0,
      };
      const result = calculateNextState(
        'DEGRADED',
        false,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('DEGRADED');
      expect(result.counters.consecutiveFailures).toBe(2);
    });

    it('transitions from DEGRADED to DOWN at threshold', () => {
      const counters: StateCounters = {
        consecutiveFailures: 2,
        consecutiveSuccesses: 0,
      };
      const result = calculateNextState(
        'DEGRADED',
        false,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('DOWN');
      expect(result.counters.consecutiveFailures).toBe(3);
    });

    it('stays DOWN on continued failures', () => {
      const counters: StateCounters = {
        consecutiveFailures: 5,
        consecutiveSuccesses: 0,
      };
      const result = calculateNextState(
        'DOWN',
        false,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('DOWN');
      expect(result.counters.consecutiveFailures).toBe(6);
    });

    it('resets consecutive successes on failure', () => {
      const counters: StateCounters = {
        consecutiveFailures: 0,
        consecutiveSuccesses: 2,
      };
      const result = calculateNextState(
        'RECOVERING',
        false,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.counters.consecutiveSuccesses).toBe(0);
      expect(result.counters.consecutiveFailures).toBe(1);
    });
  });

  describe('when check passes', () => {
    it('stays UP when already UP', () => {
      const result = calculateNextState(
        'UP',
        true,
        zeroCounters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('UP');
      expect(result.counters.consecutiveSuccesses).toBe(1);
    });

    it('transitions from DOWN to RECOVERING on first success', () => {
      const counters: StateCounters = {
        consecutiveFailures: 5,
        consecutiveSuccesses: 0,
      };
      const result = calculateNextState(
        'DOWN',
        true,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('RECOVERING');
      expect(result.counters.consecutiveSuccesses).toBe(1);
      expect(result.counters.consecutiveFailures).toBe(0);
    });

    it('stays RECOVERING until threshold successes', () => {
      const counters: StateCounters = {
        consecutiveFailures: 0,
        consecutiveSuccesses: 1,
      };
      const result = calculateNextState(
        'RECOVERING',
        true,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('RECOVERING');
      expect(result.counters.consecutiveSuccesses).toBe(2);
    });

    it('transitions from RECOVERING to UP at threshold', () => {
      const counters: StateCounters = {
        consecutiveFailures: 0,
        consecutiveSuccesses: 2,
      };
      const result = calculateNextState(
        'RECOVERING',
        true,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('UP');
      expect(result.counters.consecutiveSuccesses).toBe(3);
    });

    it('transitions from DEGRADED to UP immediately on success', () => {
      const counters: StateCounters = {
        consecutiveFailures: 2,
        consecutiveSuccesses: 0,
      };
      const result = calculateNextState(
        'DEGRADED',
        true,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.newStatus).toBe('UP');
      expect(result.counters.consecutiveSuccesses).toBe(1);
      expect(result.counters.consecutiveFailures).toBe(0);
    });

    it('resets consecutive failures on success', () => {
      const counters: StateCounters = {
        consecutiveFailures: 2,
        consecutiveSuccesses: 0,
      };
      const result = calculateNextState(
        'DOWN',
        true,
        counters,
        DEFAULT_THRESHOLD,
      );

      expect(result.counters.consecutiveFailures).toBe(0);
    });
  });

  describe('custom threshold', () => {
    it('respects custom threshold for DOWN transition', () => {
      const counters: StateCounters = {
        consecutiveFailures: 1,
        consecutiveSuccesses: 0,
      };
      const result = calculateNextState('DEGRADED', false, counters, 2);

      expect(result.newStatus).toBe('DOWN');
    });

    it('respects custom threshold for UP transition from RECOVERING', () => {
      const counters: StateCounters = {
        consecutiveFailures: 0,
        consecutiveSuccesses: 4,
      };
      const result = calculateNextState('RECOVERING', true, counters, 5);

      expect(result.newStatus).toBe('UP');
    });
  });
});

describe('shouldNotify', () => {
  it('returns true when transitioning to DOWN', () => {
    const statuses: MonitorStatus[] = ['UP', 'DEGRADED', 'RECOVERING'];

    for (const prev of statuses) {
      expect(shouldNotify(prev, 'DOWN')).toBe(true);
    }
  });

  it('returns true when transitioning from DOWN to UP', () => {
    expect(shouldNotify('DOWN', 'UP')).toBe(true);
  });

  it('returns true when transitioning from RECOVERING to UP', () => {
    expect(shouldNotify('RECOVERING', 'UP')).toBe(true);
  });

  it('returns false when transitioning from DEGRADED to UP', () => {
    expect(shouldNotify('DEGRADED', 'UP')).toBe(false);
  });

  it('returns false for intermediate transitions', () => {
    expect(shouldNotify('UP', 'DEGRADED')).toBe(false);
    expect(shouldNotify('DEGRADED', 'DEGRADED')).toBe(false);
    expect(shouldNotify('DOWN', 'RECOVERING')).toBe(false);
    expect(shouldNotify('RECOVERING', 'RECOVERING')).toBe(false);
  });

  it('returns false when status unchanged', () => {
    expect(shouldNotify('UP', 'UP')).toBe(false);
    expect(shouldNotify('DOWN', 'DOWN')).toBe(false);
  });
});

describe('parseExpectedStatusCodes', () => {
  it('parses single status code', () => {
    expect(parseExpectedStatusCodes('200')).toEqual([200]);
  });

  it('parses multiple comma-separated codes', () => {
    expect(parseExpectedStatusCodes('200,201,204')).toEqual([200, 201, 204]);
  });

  it('handles spaces around codes', () => {
    expect(parseExpectedStatusCodes('200, 201, 204')).toEqual([200, 201, 204]);
    expect(parseExpectedStatusCodes(' 200 , 201 , 204 ')).toEqual([
      200, 201, 204,
    ]);
  });

  it('filters out invalid values', () => {
    expect(parseExpectedStatusCodes('200,invalid,201')).toEqual([200, 201]);
    expect(parseExpectedStatusCodes('200,NaN,201')).toEqual([200, 201]);
  });

  it('filters out codes outside valid HTTP range', () => {
    expect(parseExpectedStatusCodes('99,200,600')).toEqual([200]);
  });

  it('returns empty array for completely invalid input', () => {
    expect(parseExpectedStatusCodes('invalid')).toEqual([]);
    expect(parseExpectedStatusCodes('')).toEqual([]);
  });
});

describe('isStatusCodeValid', () => {
  it('returns true when status code is in expected list', () => {
    expect(isStatusCodeValid(200, [200])).toBe(true);
    expect(isStatusCodeValid(201, [200, 201, 204])).toBe(true);
  });

  it('returns false when status code is not in expected list', () => {
    expect(isStatusCodeValid(404, [200])).toBe(false);
    expect(isStatusCodeValid(500, [200, 201, 204])).toBe(false);
  });

  it('returns false for null status code', () => {
    expect(isStatusCodeValid(null, [200])).toBe(false);
  });

  it('returns false for empty expected list', () => {
    expect(isStatusCodeValid(200, [])).toBe(false);
  });
});
