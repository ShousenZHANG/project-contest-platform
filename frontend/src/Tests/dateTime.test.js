import { parseApiDateTime, toLocalDateTime, toUtcDateTime } from '../lib/dateTime';

it('reads zone-less backend dates as UTC rather than browser local time', () => {
  expect(parseApiDateTime('2026-10-04T18:00:00').getTime()).toBe(
    new Date('2026-10-04T18:00:00Z').getTime(),
  );
  expect(parseApiDateTime('2026-10-04T18:00:00+08:00').getTime()).toBe(
    new Date('2026-10-04T10:00:00Z').getTime(),
  );
});

it('round trips a local schedule through the UTC API contract without fixed hours', () => {
  const local = toLocalDateTime('2026-10-04T17:35:00');
  expect(toUtcDateTime(local)).toBe('2026-10-04T17:35:00');
  expect(toLocalDateTime('unavailable')).toBe('');
});
