const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Yellowpeople%40myholiday@db.wdpnhtkgozigmphmwmnt.supabase.co:5432/postgres' });
client.connect().then(() => client.query("SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'marketplace_offers'"))
.then(r => console.log(r.rows)).catch(console.error).finally(() => client.end());
