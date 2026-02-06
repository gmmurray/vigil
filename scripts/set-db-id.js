import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';

const configPath = join(process.cwd(), 'wrangler.toml');

try {
  if (!existsSync(configPath)) {
    console.error(
      `[Build Script] Error: wrangler.toml not found at ${configPath}`,
    );
    process.exit(1);
  }

  let config = readFileSync(configPath, 'utf8');

  const realId = process.env.D1_DATABASE_ID;
  const placeholder = 'YOUR_DB_ID_HERE';

  if (realId && config.includes(placeholder)) {
    console.log(
      `[Build Script] Found D1_DATABASE_ID. Injecting into wrangler.toml...`,
    );

    config = config.replaceAll(placeholder, realId);

    writeFileSync(configPath, config);
    console.log(`[Build Script] Success: wrangler.toml patched.`);
  } else {
    console.log(
      `[Build Script] No ID injection performed (Env var missing or placeholder already removed).`,
    );
  }
} catch (err) {
  console.error('[Build Script] Unexpected error:', err);
  process.exit(1);
}
