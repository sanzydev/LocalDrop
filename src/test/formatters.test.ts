import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatSpeed,
  formatEta,
  truncateFileName,
} from '../utils/formatters';

describe('formatBytes', () => {
  it('formats zero and negative bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-100)).toBe('0 B');
  });

  it('formats bytes into KB, MB, GB properly', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatBytes(1.42 * 1024 * 1024 * 1024)).toBe('1.42 GB');
  });
});

describe('formatSpeed', () => {
  it('formats transfer speed in MB/s or KB/s', () => {
    expect(formatSpeed(0)).toBe('0 B/s');
    expect(formatSpeed(1024 * 1024 * 8.4)).toBe('8.4 MB/s');
    expect(formatSpeed(1024 * 500)).toBe('500 KB/s');
  });
});

describe('formatEta', () => {
  it('formats remaining seconds, minutes, hours', () => {
    expect(formatEta(0)).toBe('--');
    expect(formatEta(-5)).toBe('--');
    expect(formatEta(45)).toBe('45s');
    expect(formatEta(90)).toBe('1m 30s');
    expect(formatEta(3665)).toBe('1h 1m');
  });
});

describe('truncateFileName', () => {
  it('does not truncate short names', () => {
    expect(truncateFileName('photo.jpg', 20)).toBe('photo.jpg');
  });

  it('truncates in the middle keeping extension', () => {
    const longName = 'my_extremely_long_holiday_vacation_photo_2026.jpeg';
    const truncated = truncateFileName(longName, 24);
    expect(truncated.endsWith('.jpeg')).toBe(true);
    expect(truncated.includes('...')).toBe(true);
    expect(truncated.length).toBeLessThanOrEqual(26);
  });
});
