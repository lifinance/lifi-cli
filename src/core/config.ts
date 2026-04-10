import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, ENV_API_KEY, ExitCode } from './constants.js';
import { CliError } from './errors.js';

export interface CliConfig {
  apiKey?: string;
  llmProvider?: string;
  llmApiKey?: string;
}

export function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return path.join(xdg, CONFIG_DIR_NAME);
  return path.join(os.homedir(), `.${CONFIG_DIR_NAME}`);
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE_NAME);
}

export function loadConfig(): CliConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as CliConfig;
  } catch {
    throw new CliError(
      'Config file is corrupted',
      ExitCode.General,
      `Delete or fix: ${configPath}`,
    );
  }
}

export function saveConfig(updates: Partial<CliConfig>): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });

  const existing = loadConfig();
  const merged = { ...existing, ...updates };

  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', {
    mode: 0o600,
  });
}

export function getApiKey(): string | undefined {
  const envKey = process.env[ENV_API_KEY];
  if (envKey) return envKey;

  const config = loadConfig();
  return config.apiKey || undefined;
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 6) return '***';
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-3);
  return `${prefix}...${suffix}`;
}
