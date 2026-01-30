import { describe, expect, it } from 'vitest';
import { getDuration } from './utils';

describe('getDuration', () => {
  it('returns ONGOING when end is null', () => {
    expect(getDuration('2025-01-15T10:00:00Z', null)).toBe('ONGOING');
  });

  it('returns minutes only when duration is less than 1 hour', () => {
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-15T10:05:00Z')).toBe(
      '5m',
    );
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-15T10:30:00Z')).toBe(
      '30m',
    );
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-15T10:59:00Z')).toBe(
      '59m',
    );
  });

  it('returns hours and minutes when duration is 1 hour or more', () => {
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-15T11:00:00Z')).toBe(
      '1h 0m',
    );
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-15T11:30:00Z')).toBe(
      '1h 30m',
    );
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-15T14:45:00Z')).toBe(
      '4h 45m',
    );
  });

  it('handles multi-day durations', () => {
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-16T10:00:00Z')).toBe(
      '24h 0m',
    );
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-17T12:30:00Z')).toBe(
      '50h 30m',
    );
  });

  it('returns 0m for zero duration', () => {
    expect(getDuration('2025-01-15T10:00:00Z', '2025-01-15T10:00:00Z')).toBe(
      '0m',
    );
  });
});
