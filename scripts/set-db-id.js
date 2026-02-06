const fs = require('node:fs');
const path = require('node:path');

const configPath = path.join(__dirname, '..', 'wrangler.toml');

try {
  let config = fs.readFileSync(configPath, 'utf8');

  const realId = process.env.D1_DATABASE_ID;
  const placeholder = 'YOUR_DB_ID_HERE';

  if (realId && config.includes(placeholder)) {
    console.log(
      `[Build Script] Injecting D1_DATABASE_ID into wrangler.toml...`,
    );

    config = config.replace(placeholder, realId);

    fs.writeFileSync(configPath, config);
    console.log(`[Build Script] Successfully updated wrangler.toml.`);
  } else {
    console.log(
      `[Build Script] No D1_DATABASE_ID found or placeholder missing. Skipping injection.`,
    );
  }
} catch (err) {
  console.error('[Build Script] Error updating wrangler.toml:', err);
  process.exit(1);
}
