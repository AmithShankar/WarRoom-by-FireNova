import 'dotenv/config';
import { runSync } from '../src/server/coc/sync';

// Pulls live clan data from the CoC API — no fake data, ever.
async function main() {
  const result = await runSync();
  console.log(`Seed complete — synced ${result.membersSynced} members from the Clash of Clans API.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
