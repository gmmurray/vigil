import { lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { checkResults } from '../schema';

const BATCH_SIZE = 1000;
const MAX_ITERATIONS = 100; // Safety limit: 100k rows max per run

export async function cleanupCheckResults(
  db: D1Database,
  retentionDays: number,
): Promise<{ deletedCount: number }> {
  const orm = drizzle(db);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffISO = cutoffDate.toISOString();

  let totalDeleted = 0;
  let iterations = 0;

  // Batch delete to avoid D1 timeout on large datasets
  while (iterations < MAX_ITERATIONS) {
    const result = await orm
      .delete(checkResults)
      .where(lt(checkResults.checkedAt, cutoffISO))
      .limit(BATCH_SIZE)
      .run();

    const deletedInBatch = result.meta.changes ?? 0;
    totalDeleted += deletedInBatch;

    if (deletedInBatch < BATCH_SIZE) {
      // No more rows to delete
      break;
    }

    iterations++;
  }

  return { deletedCount: totalDeleted };
}
