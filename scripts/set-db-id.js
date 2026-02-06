import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';

const cwd = process.cwd();
const targetFiles = [
  'dist/vigil/wrangler.json',
  'wrangler.jsonc',
  'wrangler.json',
  'wrangler.toml',
];

const realId = process.env.D1_DATABASE_ID;

if (!realId) {
  console.log(`[Build Script] No D1_DATABASE_ID found. Skipping.`);
  process.exit(0);
}

// Regex Breakdown:
// 1. Key:    Matches "database_id" with optional quotes, optional spacing, and separator (: or =)
// 2. Value:  Matches anything inside the quotes
// 3. Quote:  Matches the closing quote
const dbIdRegex = /(["']?database_id["']?\s*[:=]\s*["'])(.*?)(["'])/g;

targetFiles.forEach(file => {
  const fullPath = join(cwd, file);
  if (existsSync(fullPath)) {
    try {
      const content = readFileSync(fullPath, 'utf8');

      if (dbIdRegex.test(content)) {
        const newContent = content.replace(dbIdRegex, `$1${realId}$3`);
        writeFileSync(fullPath, newContent);
        console.log(`[Build Script] Patched database_id in ${file}`);
      }
    } catch (e) {
      console.warn(`[Build Script] Error patching ${file}:`, e.message);
    }
  }
});
