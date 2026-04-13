import { ENV_API_KEY } from "./constants.js";

export function getApiKey(): string | undefined {
  return process.env[ENV_API_KEY] || undefined;
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 6) return "***";
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-3);
  return `${prefix}...${suffix}`;
}
