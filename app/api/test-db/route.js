import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      UPDATE marketplace_offers SET status = 'accepted';
    `);
    return NextResponse.json({ success: true, message: "All offers accepted" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  } finally {
    await client.end();
  }
}
