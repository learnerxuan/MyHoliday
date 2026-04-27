'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() }
      }
    }
  )
}

export async function acceptGuide(guideId: string) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('tour_guides')
    .update({ verification_status: 'approved' })
    .eq('id', guideId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/tour-guides/requests')
  revalidatePath('/admin/tour-guides')
}

export async function declineGuide(guideId: string) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('tour_guides')
    .delete()
    .eq('id', guideId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/tour-guides/requests')
}
