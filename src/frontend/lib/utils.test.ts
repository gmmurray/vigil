import { describe, expect, it } from 'vitest';
import { cn, formatInterval, formatSecondsAgo, getDuration } from './utils';

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

describe('cn', () => {
  it('combines multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe(
      'base included',
    );
  });

  it('merges tailwind classes (last wins)', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('handles object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('merges conflicting tailwind utilities correctly', () => {
    expect(cn('p-4 px-2')).toBe('p-4 px-2');
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('preserves non-conflicting classes', () => {
    expect(cn('bg-red-500', 'text-white', 'p-4')).toBe(
      'bg-red-500 text-white p-4',
    );
  });
});

describe('formatSecondsAgo', () => {
  it('returns seconds format when under 60 seconds', () => {
    expect(formatSecondsAgo(0)).toBe('0s ago');
    expect(formatSecondsAgo(1)).toBe('1s ago');
    expect(formatSecondsAgo(30)).toBe('30s ago');
    expect(formatSecondsAgo(59)).toBe('59s ago');
  });

  it('returns minutes format when 60 seconds or more', () => {
    expect(formatSecondsAgo(60)).toBe('1m ago');
    expect(formatSecondsAgo(90)).toBe('1m ago');
    expect(formatSecondsAgo(120)).toBe('2m ago');
    expect(formatSecondsAgo(3600)).toBe('60m ago');
  });
});

describe('formatInterval', () => {
  it('returns seconds format when under 60 seconds', () => {
    expect(formatInterval(10)).toBe('every 10s');
    expect(formatInterval(30)).toBe('every 30s');
    expect(formatInterval(59)).toBe('every 59s');
  });

  it('returns minutes format when 60 seconds or more', () => {
    expect(formatInterval(60)).toBe('every 1m');
    expect(formatInterval(120)).toBe('every 2m');
    expect(formatInterval(300)).toBe('every 5m');
    expect(formatInterval(3600)).toBe('every 60m');
  });
});
