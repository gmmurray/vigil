import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';

const cwd = process.cwd();
const targetFiles = [
  'wrangler.jsonc',
  'wrangler.json',
  'wrangler.toml',
  'dist/vigil/wrangler.json',
  'dist/wrangler.json',
];

let patchedCount = 0;
const realId = process.env.D1_DATABASE_ID;
const placeholder = 'YOUR_DB_ID_HERE';

if (!realId) {
  console.log(`[Build Script] No D1_DATABASE_ID in env. Skipping.`);
  process.exit(0);
}

console.log(`[Build Script] searching for config files to patch...`);

for (const relativePath of targetFiles) {
  const fullPath = join(cwd, relativePath);

  if (existsSync(fullPath)) {
    try {
      let config = readFileSync(fullPath, 'utf8');

      if (config.includes(placeholder)) {
        console.log(`[Build Script] Patching ${relativePath}...`);
        config = config.replaceAll(placeholder, realId);
        writeFileSync(fullPath, config);
        patchedCount++;
      } else {
        console.log(
          `[Build Script] ${relativePath} found but no placeholder to replace.`,
        );
      }
    } catch (err) {
      console.warn(
        `[Build Script] Failed to patch ${relativePath}:`,
        err.message,
      );
    }
  }
}

if (patchedCount === 0) {
  console.warn(
    `[Build Script] WARNING: No files were patched! Check your paths.`,
  );
} else {
  console.log(`[Build Script] Success! Patched ${patchedCount} file(s).`);
}
