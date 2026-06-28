import fs from "node:fs";
import path from "node:path";

let loaded = false;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim().replace(/^\uFEFF/, "");
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

export function loadEnv() {
  if (loaded) return;
  loaded = true;

  const root = process.cwd();
  parseEnvFile(path.join(root, ".env"));
  parseEnvFile(path.join(root, ".env.local"));
}

export function getEnv(key, fallback) {
  loadEnv();
  return process.env[key] ?? fallback;
}

export function requireEnv(key) {
  const value = getEnv(key);

  if (!value) {
    throw new Error(`${key} is missing`);
  }

  return value;
}
