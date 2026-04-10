import { describe, it, expect, vi } from 'vitest';
import {
  formatAmount,
  formatUsd,
  formatDuration,
  formatTable,
  isJsonMode,
  jsonOutput,
} from './formatter.js';

describe('formatter', () => {
  describe('formatAmount', () => {
    it('converts wei to ETH (18 decimals)', () => {
      expect(formatAmount('1500000000000000000', 18)).toBe('1.5');
    });

    it('converts USDC units (6 decimals)', () => {
      expect(formatAmount('1000000', 6)).toBe('1');
    });

    it('handles zero', () => {
      expect(formatAmount('0', 18)).toBe('0');
    });

    it('handles large amounts', () => {
      expect(formatAmount('10000000000000000000000', 18)).toBe('10000');
    });

    it('trims trailing zeros after decimal', () => {
      expect(formatAmount('1000000000000000000', 18)).toBe('1');
    });

    it('preserves meaningful decimals', () => {
      expect(formatAmount('1234567890000000000', 18)).toBe('1.23456789');
    });
  });

  describe('formatUsd', () => {
    it('formats dollar amount with two decimals', () => {
      expect(formatUsd(1.24)).toBe('$1.24');
    });

    it('formats zero', () => {
      expect(formatUsd(0)).toBe('$0.00');
    });

    it('formats large numbers', () => {
      expect(formatUsd(12345.6)).toBe('$12,345.60');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds to minutes', () => {
      expect(formatDuration(120)).toBe('~2 min');
    });

    it('formats less than a minute', () => {
      expect(formatDuration(30)).toBe('~30 sec');
    });

    it('formats hours', () => {
      expect(formatDuration(7200)).toBe('~2 hr');
    });

    it('formats mixed minutes', () => {
      expect(formatDuration(90)).toBe('~2 min');
    });
  });

  describe('formatTable', () => {
    it('returns a string with headers and rows', () => {
      const result = formatTable(['Name', 'Value'], [['foo', 'bar'], ['baz', 'qux']]);
      expect(result).toContain('Name');
      expect(result).toContain('Value');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      expect(result).toContain('baz');
      expect(result).toContain('qux');
    });

    it('handles empty rows', () => {
      const result = formatTable(['Name'], []);
      expect(result).toContain('Name');
    });
  });

  describe('isJsonMode', () => {
    it('returns true when json option is set', () => {
      expect(isJsonMode({ json: true })).toBe(true);
    });

    it('returns false when json option is not set and stdout is TTY', () => {
      const origIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      expect(isJsonMode({})).toBe(false);
      process.stdout.isTTY = origIsTTY;
    });

    it('returns false when json is explicitly false and stdout is TTY', () => {
      const origIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      expect(isJsonMode({ json: false })).toBe(false);
      process.stdout.isTTY = origIsTTY;
    });

    it('returns true when stdout is not a TTY (piped)', () => {
      const origIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = undefined as any;
      expect(isJsonMode({})).toBe(true);
      process.stdout.isTTY = origIsTTY;
    });
  });

  describe('jsonOutput', () => {
    it('returns formatted JSON string', () => {
      const data = { foo: 'bar', num: 42 };
      const result = jsonOutput(data);
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('contains no ANSI escape codes', () => {
      const result = jsonOutput({ test: 'value' });
      // ANSI escape codes start with \x1b[
      expect(result).not.toMatch(/\x1b\[/);
    });
  });
});
