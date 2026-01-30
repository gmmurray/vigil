import {
  defineWorkersConfig,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  const migrationsPath = './src/worker/drizzle';
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      include: ['src/**/*.integration.test.ts'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
            },
          },
        },
      },
    },
  };
});
