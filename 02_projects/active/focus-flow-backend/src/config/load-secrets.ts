import * as fs from 'fs';
import * as path from 'path';

/**
 * SECURITY: Load secrets from secure location
 */
export function loadOpenClawSecrets(): void {
  const secretsPath = '/srv/focus-flow/07_system/secrets/.openclaw.env';

  if (!fs.existsSync(secretsPath)) {
    console.warn(`[Security] WARNING: OpenClaw secrets file not found: ${secretsPath}`);
    console.warn('[Security] OpenClaw will not function without OPENCLAW_AUTH_TOKEN');
    console.warn('[Security] To create: echo "OPENCLAW_AUTH_TOKEN=$(openssl rand -hex 32)" > ' + secretsPath);
    console.warn('[Security] Then: chmod 600 ' + secretsPath);
    return;
  }

  // Check file permissions (should be 600)
  try {
    const stats = fs.statSync(secretsPath);
    const permissions = (stats.mode & 0o777).toString(8);

    if (permissions !== '600') {
      console.warn(`[SECURITY] WARNING: ${secretsPath} has insecure permissions: ${permissions}. Should be 600.`);
      console.warn(`[SECURITY] Fix with: chmod 600 ${secretsPath}`);
    }
  } catch (error) {
    console.error('[Security] Failed to check permissions:', error);
  }

  // Load secrets
  try {
    const secrets = fs.readFileSync(secretsPath, 'utf8');
    const lines = secrets.split('\n');

    let loadedCount = 0;
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
          loadedCount++;
        }
      }
    }

    console.log(`[Security] OpenClaw secrets loaded from secure location (${loadedCount} variables)`);
  } catch (error) {
    console.error('[Security] Failed to load OpenClaw secrets:', error);
    throw new Error('Failed to load OpenClaw secrets. OpenClaw services will not function.');
  }
}

export function loadLiveKitSecrets(): void {
  const secretsPath = '/srv/focus-flow/07_system/secrets/.livekit.env';

  if (!fs.existsSync(secretsPath)) {
    console.warn(`[Security] LiveKit secrets file not found: ${secretsPath}`);
    console.warn('[Security] LiveKit voice will not function without credentials');
    return;
  }

  try {
    const secrets = fs.readFileSync(secretsPath, 'utf8');
    const lines = secrets.split('\n');

    let loadedCount = 0;
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
          loadedCount++;
        }
      }
    }

    console.log(`[Security] LiveKit secrets loaded from secure location (${loadedCount} variables)`);
  } catch (error) {
    console.error('[Security] Failed to load LiveKit secrets:', error);
  }
}
