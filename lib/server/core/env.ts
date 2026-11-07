import "server-only";

export const isProd = process.env.NODE_ENV === "production";

export class ConfigError extends Error {
  constructor(name: string) {
    super(`Missing server configuration: ${name}`);
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(name);
  return value;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
