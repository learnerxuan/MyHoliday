const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Yellowpeople%40myholiday@db.wdpnhtkgozigmphmwmnt.supabase.co:5432/postgres' });
const queries = [
  `DROP POLICY IF EXISTS "Enable insert for guides" ON marketplace_offers;`,
  `CREATE POLICY "Enable insert for guides" ON marketplace_offers FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM tour_guides tg WHERE tg.id = guide_id AND tg.user_id = auth.uid()));`,
  
  `DROP POLICY IF EXISTS "Enable update for guides based on guide_id" ON marketplace_offers;`,
  `CREATE POLICY "Enable update for guides based on guide_id" ON marketplace_offers FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM tour_guides tg WHERE tg.id = guide_id AND tg.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM tour_guides tg WHERE tg.id = guide_id AND tg.user_id = auth.uid()));`
];

async function run() {
  await client.connect();
  for (const q of queries) {
    console.log('Running:', q);
    await client.query(q);
  }
  await client.end();
}
run().catch(console.error);
