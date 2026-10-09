const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://neondb_owner:npg_06sOICPEnDwa@ep-bold-dream-a7toeuh5-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
(async () => {
  await c.connect();
  const rows = await c.query(`select id, blend_name, created_at from batch_records order by created_at desc limit 10`);
  console.log('batch_records rows:', rows.rows.length);
  rows.rows.forEach(r => console.log(' ', r.id, '|', r.blend_name, '|', r.created_at));
  // insert a probe row to test the public page
  await c.query(`insert into batch_records (id, blend_name, mode, oils, size, expires_at, created_at) values ('OA-TEST-PROBE', 'QR Probe Blend', 'pure', '[{"oilId":"lavender","oilName":"Lavender","ml":30,"percentage":100}]', 30, now() + interval '1 year', now()) on conflict (id) do nothing`);
  console.log('probe row inserted');
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
