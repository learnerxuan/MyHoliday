import { NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: Request) {
  try {
    const { userIds } = await request.json()
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json([])
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })
    
    await client.connect()
    
    const query = `
      SELECT user_id, full_name 
      FROM public.traveller_profiles 
      WHERE user_id = ANY($1::uuid[])
    `
    const result = await client.query(query, [userIds])
    
    await client.end()
    
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching profiles via pg:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
