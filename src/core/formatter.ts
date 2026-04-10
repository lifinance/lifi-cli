import Table from 'cli-table3';

export function formatAmount(amount: string, decimals: number): string {
  if (amount === '0') return '0';

  const padded = amount.padStart(decimals + 1, '0');
  const intPart = padded.slice(0, padded.length - decimals) || '0';
  const fracPart = padded.slice(padded.length - decimals).replace(/0+$/, '');

  if (!fracPart) return intPart;
  return `${intPart}.${fracPart}`;
}

export function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    return `~${Math.round(seconds / 3600)} hr`;
  }
  if (seconds >= 60) {
    return `~${Math.round(seconds / 60)} min`;
  }
  return `~${seconds} sec`;
}

export function formatTable(headers: string[], rows: string[][]): string {
  const table = new Table({
    head: headers,
  });

  for (const row of rows) {
    table.push(row);
  }

  return table.toString();
}

export function isJsonMode(options: { json?: boolean }): boolean {
  if (options.json === true) return true;
  return !process.stdout.isTTY;
}

export function jsonOutput(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function output(data: unknown, options: { json?: boolean }): void {
  if (isJsonMode(options)) {
    console.log(jsonOutput(data));
  } else {
    console.log(jsonOutput(data));
  }
}
