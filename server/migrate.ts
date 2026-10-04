import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || 'yCH2z+%_FxL#jU2';
  const host = process.env.SUPABASE_DB_HOST || 'db.bturhosivfvyvanztkjb.supabase.co';

  console.log(`Connecting to PostgreSQL (${connectionString ? 'via Connection String / Neon' : host})...`);

  const client = connectionString
    ? new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
      })
    : new Client({
        host,
        port: Number(process.env.SUPABASE_DB_PORT) || 5432,
        user: process.env.SUPABASE_DB_USER || 'postgres',
        password: dbPassword,
        database: process.env.SUPABASE_DB_NAME || 'postgres',
        ssl: { rejectUnauthorized: false }
      });

  try {
    await client.connect();
    console.log('Connected to live Supabase Postgres!');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql migrations (profiles, sessions, session_notes, drills, drill_attempts, flagged_topics)...');
    await client.query(sql);

    console.log('Schema migration executed successfully!');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\nLive Public Tables in Supabase:');
    res.rows.forEach(r => console.log(` - ${r.table_name}`));

    // Check seed session
    const sessionRes = await client.query('SELECT id, student_name, subject, is_approved FROM public.sessions;');
    console.log('\nSeeded Sessions:', sessionRes.rows);

    await client.end();
    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
