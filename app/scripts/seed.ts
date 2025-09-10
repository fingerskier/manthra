/* eslint-env node */
import { db } from '../src/db.ts';
import quotes from '../src/quotes.ts';

const databaseUrl = process.env.DEXIE_CLOUD_URL;

async function main() {
  if (databaseUrl) {
    db.cloud.configure({ databaseUrl });
  }

  await db.quotes.bulkPut(quotes);
  console.log(`Inserted ${quotes.length} quotes`);
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
