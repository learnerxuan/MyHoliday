import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { count, error } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return Response.json({ 
      success: true, 
      destinations: count 
    })
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}